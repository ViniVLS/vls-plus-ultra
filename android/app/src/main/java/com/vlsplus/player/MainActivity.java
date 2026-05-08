package com.vlsplus.player;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register custom plugins
        registerPlugin(MediaControlsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
