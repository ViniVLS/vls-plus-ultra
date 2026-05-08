package com.vlsplus.player;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Base64;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

/**
 * Foreground Service for media playback.
 * Keeps audio alive in background and shows a persistent notification
 * with playback controls (play/pause, next, previous).
 */
public class MediaPlaybackService extends Service {

    private static final String TAG = "MediaPlaybackService";
    private static final String CHANNEL_ID = "vls_plus_media_channel";
    private static final int NOTIFICATION_ID = 1001;

    public static final String ACTION_PLAY = "com.vlsplus.player.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.vlsplus.player.ACTION_PAUSE";
    public static final String ACTION_NEXT = "com.vlsplus.player.ACTION_NEXT";
    public static final String ACTION_PREVIOUS = "com.vlsplus.player.ACTION_PREVIOUS";
    public static final String ACTION_STOP = "com.vlsplus.player.ACTION_STOP";
    public static final String ACTION_UPDATE_META = "com.vlsplus.player.ACTION_UPDATE_META";

    private MediaSessionCompat mediaSession;
    private PowerManager.WakeLock wakeLock;
    private boolean isPlaying = false;
    private String currentTitle = "VLS PLUS";
    private String currentArtist = "";
    private Bitmap currentArt = null;

    // Static reference for the plugin to communicate
    private static MediaPlaybackService instance;
    private static MediaCommandListener commandListener;

    public interface MediaCommandListener {
        void onPlay();
        void onPause();
        void onNext();
        void onPrevious();
        void onStop();
    }

    public static void setCommandListener(MediaCommandListener listener) {
        commandListener = listener;
    }

    public static MediaPlaybackService getInstance() {
        return instance;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        createNotificationChannel();
        initMediaSession();
        acquireWakeLock();
        Log.d(TAG, "MediaPlaybackService created");
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "VLS PLUS Player",
                NotificationManager.IMPORTANCE_LOW // Low so it doesn't make sound
            );
            channel.setDescription("Controles de reprodução de música");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void initMediaSession() {
        mediaSession = new MediaSessionCompat(this, "VLSPlusSession");

        mediaSession.setFlags(
            MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
            MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS
        );

        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                Log.d(TAG, "MediaSession: onPlay");
                if (commandListener != null) commandListener.onPlay();
            }

            @Override
            public void onPause() {
                Log.d(TAG, "MediaSession: onPause");
                if (commandListener != null) commandListener.onPause();
            }

            @Override
            public void onSkipToNext() {
                Log.d(TAG, "MediaSession: onSkipToNext");
                if (commandListener != null) commandListener.onNext();
            }

            @Override
            public void onSkipToPrevious() {
                Log.d(TAG, "MediaSession: onSkipToPrevious");
                if (commandListener != null) commandListener.onPrevious();
            }

            @Override
            public void onStop() {
                Log.d(TAG, "MediaSession: onStop");
                if (commandListener != null) commandListener.onStop();
                stopSelf();
            }
        });

        mediaSession.setActive(true);
    }

    private void acquireWakeLock() {
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "VLSPlus::MediaWakeLock"
            );
            wakeLock.acquire(10 * 60 * 1000L); // 10 min max, renewed on updates
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            return START_STICKY;
        }

        String action = intent.getAction();
        if (action != null) {
            switch (action) {
                case ACTION_PLAY:
                    handlePlay();
                    break;
                case ACTION_PAUSE:
                    handlePause();
                    break;
                case ACTION_NEXT:
                    if (commandListener != null) commandListener.onNext();
                    break;
                case ACTION_PREVIOUS:
                    if (commandListener != null) commandListener.onPrevious();
                    break;
                case ACTION_STOP:
                    handleStop();
                    return START_NOT_STICKY;
                case ACTION_UPDATE_META:
                    currentTitle = intent.getStringExtra("title");
                    currentArtist = intent.getStringExtra("artist");
                    String artBase64 = intent.getStringExtra("artwork");
                    if (artBase64 != null && !artBase64.isEmpty()) {
                        try {
                            // Remove data:image/... prefix if present
                            String base64Data = artBase64;
                            if (base64Data.contains(",")) {
                                base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
                            }
                            byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);
                            currentArt = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
                        } catch (Exception e) {
                            Log.e(TAG, "Error decoding artwork", e);
                            currentArt = null;
                        }
                    }
                    boolean playing = intent.getBooleanExtra("isPlaying", isPlaying);
                    isPlaying = playing;
                    updateNotification();
                    break;
            }
        }

        // Start as foreground immediately
        startForeground(NOTIFICATION_ID, buildNotification());
        return START_STICKY;
    }

    private void handlePlay() {
        isPlaying = true;
        if (commandListener != null) commandListener.onPlay();
        updatePlaybackState(PlaybackStateCompat.STATE_PLAYING);
        updateNotification();
        // Renew wake lock
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(10 * 60 * 1000L);
        }
    }

    private void handlePause() {
        isPlaying = false;
        if (commandListener != null) commandListener.onPause();
        updatePlaybackState(PlaybackStateCompat.STATE_PAUSED);
        updateNotification();
    }

    private void handleStop() {
        isPlaying = false;
        if (commandListener != null) commandListener.onStop();
        mediaSession.setActive(false);
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    public void updateMetadata(String title, String artist, Bitmap art) {
        currentTitle = title != null ? title : "VLS PLUS";
        currentArtist = artist != null ? artist : "";
        currentArt = art;
        updateNotification();
    }

    public void setPlayingState(boolean playing) {
        isPlaying = playing;
        updatePlaybackState(playing ?
            PlaybackStateCompat.STATE_PLAYING :
            PlaybackStateCompat.STATE_PAUSED);
        updateNotification();
    }

    private void updatePlaybackState(int state) {
        PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
            .setActions(
                PlaybackStateCompat.ACTION_PLAY |
                PlaybackStateCompat.ACTION_PAUSE |
                PlaybackStateCompat.ACTION_PLAY_PAUSE |
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT |
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS |
                PlaybackStateCompat.ACTION_STOP
            )
            .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f);

        mediaSession.setPlaybackState(stateBuilder.build());
    }

    private void updateNotification() {
        // Update media session metadata
        MediaMetadataCompat.Builder metaBuilder = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, currentTitle)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, currentArtist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, "VLS PLUS");

        if (currentArt != null) {
            metaBuilder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, currentArt);
        }

        mediaSession.setMetadata(metaBuilder.build());
        updatePlaybackState(isPlaying ?
            PlaybackStateCompat.STATE_PLAYING :
            PlaybackStateCompat.STATE_PAUSED);

        // Update the foreground notification
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification());
        }
    }

    private Notification buildNotification() {
        // Intent to open the app when tapping notification
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openAppPendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Action intents
        PendingIntent prevIntent = createActionIntent(ACTION_PREVIOUS, 1);
        PendingIntent playPauseIntent = createActionIntent(
            isPlaying ? ACTION_PAUSE : ACTION_PLAY, 2
        );
        PendingIntent nextIntent = createActionIntent(ACTION_NEXT, 3);
        PendingIntent stopIntent = createActionIntent(ACTION_STOP, 4);

        // Build notification
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(currentTitle != null ? currentTitle : "VLS PLUS")
            .setContentText(currentArtist != null ? currentArtist : "")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(openAppPendingIntent)
            .setDeleteIntent(stopIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(isPlaying)
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        if (currentArt != null) {
            builder.setLargeIcon(currentArt);
        }

        // Add media actions
        builder.addAction(R.drawable.ic_skip_previous, "Anterior", prevIntent);
        builder.addAction(
            isPlaying ? R.drawable.ic_pause : R.drawable.ic_play,
            isPlaying ? "Pausar" : "Reproduzir",
            playPauseIntent
        );
        builder.addAction(R.drawable.ic_skip_next, "Próxima", nextIntent);

        // MediaStyle
        builder.setStyle(new MediaStyle()
            .setMediaSession(mediaSession.getSessionToken())
            .setShowActionsInCompactView(0, 1, 2) // Show all 3 in compact
            .setShowCancelButton(true)
            .setCancelButtonIntent(stopIntent)
        );

        return builder.build();
    }

    private PendingIntent createActionIntent(String action, int requestCode) {
        Intent intent = new Intent(this, MediaPlaybackService.class);
        intent.setAction(action);
        return PendingIntent.getService(
            this, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        instance = null;
        super.onDestroy();
        Log.d(TAG, "MediaPlaybackService destroyed");
    }
}
