package com.e23running.app.kimi.preview;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 注册原生GPS跑步插件
        registerPlugin(com.e23running.app.kimi.preview.run.GpsRunPlugin.class);
    }
}
