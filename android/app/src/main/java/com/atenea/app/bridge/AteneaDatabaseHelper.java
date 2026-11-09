package com.atenea.app.bridge;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.database.sqlite.SQLiteException;

final class AteneaDatabaseHelper extends SQLiteOpenHelper {
  private static final int VERSION = 1;

  AteneaDatabaseHelper(Context context) {
    super(context.getApplicationContext(), "atenea-alerts.db", null, VERSION);
  }

  @Override
  public void onCreate(SQLiteDatabase db) {
    db.execSQL("CREATE TABLE alerts ("
        + "id TEXT NOT NULL PRIMARY KEY, groupId TEXT NOT NULL, "
        + "userId TEXT, createdBy TEXT, category TEXT NOT NULL, "
        + "title TEXT NOT NULL, description TEXT NOT NULL, soundType TEXT NOT NULL, "
        + "latitude REAL, longitude REAL, city TEXT NOT NULL, district TEXT NOT NULL, "
        + "mediaUrl TEXT, mediaType TEXT, createdAt INTEGER NOT NULL)");
    db.execSQL("CREATE INDEX alerts_by_date ON alerts (createdAt DESC, id ASC)");
    db.execSQL("CREATE INDEX alerts_by_group_date ON alerts (groupId, createdAt DESC, id ASC)");
  }

  @Override
  public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
    throw new SQLiteException("No migration from " + oldVersion + " to " + newVersion);
  }
}
