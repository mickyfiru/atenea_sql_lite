package com.atenea.app.bridge;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.annotations.ReactModule;

@ReactModule(name = AteneaBridgeModule.NAME)
public final class AteneaBridgeModule extends NativeAteneaBridgeSpec {
  public static final String NAME = "NativeAteneaBridge";

  public AteneaBridgeModule(ReactApplicationContext context) {
    super(context);
  }

  @Override
  public String getDiagnosticMessage() {
    return "ATENEA_JAVA_OK";
  }
}
