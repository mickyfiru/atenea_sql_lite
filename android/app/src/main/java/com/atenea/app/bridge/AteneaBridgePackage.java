package com.atenea.app.bridge;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import java.util.Collections;

public final class AteneaBridgePackage extends BaseReactPackage {
  @Override
  public NativeModule getModule(String name, ReactApplicationContext context) {
    if (AteneaBridgeModule.NAME.equals(name)) {
      return new AteneaBridgeModule(context);
    }
    return null;
  }

  @Override
  public ReactModuleInfoProvider getReactModuleInfoProvider() {
    return () -> Collections.singletonMap(
        AteneaBridgeModule.NAME,
        new ReactModuleInfo(
            AteneaBridgeModule.NAME,
            AteneaBridgeModule.class.getName(),
            false, // canOverrideExistingModule
            false, // needsEagerInit
            false, // isCxxModule
            true)); // isTurboModule
  }
}
