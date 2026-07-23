package com.e23running.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.e23running.app.gps.GpsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(GpsPlugin.class);
    }
}
