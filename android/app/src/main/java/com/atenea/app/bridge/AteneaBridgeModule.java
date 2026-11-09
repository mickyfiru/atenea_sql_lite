package com.atenea.app.bridge;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.module.annotations.ReactModule;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.function.Supplier;

@ReactModule(name = AteneaBridgeModule.NAME)
public final class AteneaBridgeModule extends NativeAteneaBridgeSpec {
  public static final String NAME = "NativeAteneaBridge";
  private final ExecutorService databaseExecutor = Executors.newSingleThreadExecutor();
  private final AteneaDatabaseHelper helper;
  private final AteneaAlertDao alerts;

  public AteneaBridgeModule(ReactApplicationContext context) {
    super(context);
    helper = new AteneaDatabaseHelper(context);
    alerts = new AteneaAlertDao(helper);
  }

  @Override
  public String getDiagnosticMessage() {
    return "ATENEA_JAVA_OK";
  }

  @Override
  public void insertAlert(ReadableMap alert, Promise promise) {
    runDatabaseOperation(promise, () -> {
      alerts.insert(alert);
      return null;
    });
  }

  @Override
  public void listAlerts(String groupId, Promise promise) {
    runDatabaseOperation(promise, () -> alerts.list(groupId));
  }

  @Override
  public void findAlert(String id, Promise promise) {
    runDatabaseOperation(promise, () -> alerts.find(id));
  }

  @Override
  public void updateAlert(String id, String actorId, String title, String description, String category, Promise promise) {
    runDatabaseOperation(promise, () -> alerts.update(id, actorId, title, description, category));
  }

  @Override
  public void deleteAlert(String id, String actorId, Promise promise) {
    runDatabaseOperation(promise, () -> alerts.delete(id, actorId));
  }

  private synchronized void runDatabaseOperation(Promise promise, Supplier<Object> operation) {
    try {
      databaseExecutor.execute(() -> {
        try {
          promise.resolve(operation.get());
        } catch (RuntimeException error) {
          promise.reject("E_ATENEA_SQLITE", error);
        }
      });
    } catch (RejectedExecutionException error) {
      promise.reject("E_ATENEA_SQLITE_CLOSED", error);
    }
  }

  @Override
  public synchronized void invalidate() {
    if (!databaseExecutor.isShutdown()) {
      databaseExecutor.execute(helper::close);
      databaseExecutor.shutdown();
    }
    super.invalidate();
  }
}
