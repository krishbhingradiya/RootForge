package com.rootforge.aisolutionbuilder;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSIONS_REQUEST_CODE = 1002;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            if (bridge != null && bridge.getWebView() != null) {
                WebSettings settings = bridge.getWebView().getSettings();
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                settings.setMediaPlaybackRequiresUserGesture(false);
            }
            
            // Check RECORD_AUDIO permission at launch to ensure Android system permissions align with WebView
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.MODIFY_AUDIO_SETTINGS
                }, PERMISSIONS_REQUEST_CODE);
            }
        } catch (Exception ignored) {
        }
    }
}
