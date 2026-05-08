package com.vlsplus.player;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import android.Manifest;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "MediaControls",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class MediaControlsPlugin extends Plugin {

    private static final String TAG = "MediaControlsPlugin";

    @Override
    public void load() {
        // Set command listener to forward native button presses back to JS
        MediaPlaybackService.setCommandListener(new MediaPlaybackService.MediaCommandListener() {
            @Override
            public void onPlay() {
                notifyListeners("mediaAction", createEvent("play"));
            }

            @Override
            public void onPause() {
                notifyListeners("mediaAction", createEvent("pause"));
            }

            @Override
            public void onNext() {
                notifyListeners("mediaAction", createEvent("next"));
            }

            @Override
            public void onPrevious() {
                notifyListeners("mediaAction", createEvent("previous"));
            }

            @Override
            public void onStop() {
                notifyListeners("mediaAction", createEvent("stop"));
            }
        });
    }

    private JSObject createEvent(String action) {
        JSObject obj = new JSObject();
        obj.put("action", action);
        return obj;
    }

    @PluginMethod()
    public void startService(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33) {
            if (getPermissionState("notifications") != com.getcapacitor.PermissionState.GRANTED) {
                requestPermissionForAlias("notifications", call, "notificationsPermsCallback");
                return;
            }
        }
        executeStartService(call);
    }

    @PermissionCallback
    private void notificationsPermsCallback(PluginCall call) {
        if (getPermissionState("notifications") == com.getcapacitor.PermissionState.GRANTED) {
            executeStartService(call);
        } else {
            // Still start service, but the notification won't show
            executeStartService(call);
        }
    }

    private void executeStartService(PluginCall call) {
        String title = call.getString("title", "VLS PLUS");
        String artist = call.getString("artist", "");
        String artwork = call.getString("artwork", "");
        boolean isPlaying = call.getBoolean("isPlaying", true);

        Context context = getContext();
        Intent intent = new Intent(context, MediaPlaybackService.class);
        intent.setAction(MediaPlaybackService.ACTION_UPDATE_META);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
        intent.putExtra("artwork", artwork);
        intent.putExtra("isPlaying", isPlaying);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start service", e);
            call.reject("Failed to start media service: " + e.getMessage());
        }
    }

    @PluginMethod()
    public void updateMetadata(PluginCall call) {
        String title = call.getString("title", "VLS PLUS");
        String artist = call.getString("artist", "");
        String artwork = call.getString("artwork", "");
        boolean isPlaying = call.getBoolean("isPlaying", true);

        Context context = getContext();
        Intent intent = new Intent(context, MediaPlaybackService.class);
        intent.setAction(MediaPlaybackService.ACTION_UPDATE_META);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
        intent.putExtra("artwork", artwork);
        intent.putExtra("isPlaying", isPlaying);

        try {
            context.startService(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to update metadata", e);
            call.reject("Failed to update metadata: " + e.getMessage());
        }
    }

    @PluginMethod()
    public void updatePlayState(PluginCall call) {
        boolean isPlaying = call.getBoolean("isPlaying", false);

        MediaPlaybackService service = MediaPlaybackService.getInstance();
        if (service != null) {
            service.setPlayingState(isPlaying);
            call.resolve();
        } else {
            // Service not running, start it
            startService(call);
        }
    }

    @PluginMethod()
    public void stopService(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, MediaPlaybackService.class);
        intent.setAction(MediaPlaybackService.ACTION_STOP);

        try {
            context.startService(intent);
            call.resolve();
        } catch (Exception e) {
            // Service may not be running
            call.resolve();
        }
    }
}
