package com.e23running.app.kimi.preview;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Capacitor在super.onCreate()中创建Bridge，自定义插件必须先注册。
        registerPlugin(com.e23running.app.kimi.preview.run.GpsRunPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
