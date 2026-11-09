package com.atenea.app.bridge;

import android.content.ContentValues;
import android.database.Cursor;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

final class AteneaAlertDao {
  private static final String TABLE = "alerts";
  private static final String BY_ID = "id = ?";
  private static final String BY_OWNER = BY_ID
      + " AND COALESCE(NULLIF(createdBy, ''), NULLIF(userId, '')) = ?";
  private static final String[] REQUIRED_TEXT = {
    "id", "groupId", "category", "title", "description", "soundType", "city", "district"
  };
  private static final String[] OPTIONAL_TEXT = {"userId", "createdBy", "mediaUrl", "mediaType"};
  private static final String[] COORDINATES = {"latitude", "longitude"};
  private final AteneaDatabaseHelper helper;

  AteneaAlertDao(AteneaDatabaseHelper helper) {
    this.helper = helper;
  }

  void insert(ReadableMap alert) {
    helper.getWritableDatabase().insertOrThrow(TABLE, null, values(alert));
  }

  WritableArray list(String groupId) {
    WritableArray alerts = Arguments.createArray();
    try (Cursor cursor = helper.getReadableDatabase().query(
        TABLE, null, groupId == null ? null : "groupId = ?",
        groupId == null ? null : new String[] {groupId}, null, null, "createdAt DESC, id ASC")) {
      while (cursor.moveToNext()) {
        alerts.pushMap(read(cursor));
      }
    }
    return alerts;
  }

  WritableMap find(String id) {
    try (Cursor cursor = helper.getReadableDatabase().query(
        TABLE, null, BY_ID, new String[] {id}, null, null, null)) {
      return cursor.moveToFirst() ? read(cursor) : null;
    }
  }

  boolean update(String id, String actorId, String title, String description, String category) {
    ContentValues changes = new ContentValues();
    changes.put("title", title);
    changes.put("description", description);
    changes.put("category", category);
    changes.put("soundType", category);
    return helper.getWritableDatabase().update(TABLE, changes, BY_OWNER, new String[] {id, actorId}) == 1;
  }

  boolean delete(String id, String actorId) {
    return helper.getWritableDatabase().delete(TABLE, BY_OWNER, new String[] {id, actorId}) == 1;
  }

  private static ContentValues values(ReadableMap alert) {
    ContentValues values = new ContentValues();
    for (String key : REQUIRED_TEXT) {
      values.put(key, alert.getString(key));
    }
    for (String key : OPTIONAL_TEXT) {
      values.put(key, alert.getString(key));
    }
    for (String key : COORDINATES) {
      if (alert.isNull(key)) {
        values.putNull(key);
      } else {
        values.put(key, alert.getDouble(key));
      }
    }
    double timestamp = alert.getDouble("createdAt");
    if (!Double.isFinite(timestamp) || Math.abs(timestamp) > 8_640_000_000_000_000L) {
      throw new IllegalArgumentException("Invalid alert creation date");
    }
    values.put("createdAt", (long) timestamp);
    return values;
  }

  private static WritableMap read(Cursor cursor) {
    WritableMap alert = Arguments.createMap();
    for (String key : REQUIRED_TEXT) {
      alert.putString(key, cursor.getString(cursor.getColumnIndexOrThrow(key)));
    }
    for (String key : OPTIONAL_TEXT) {
      alert.putString(key, cursor.getString(cursor.getColumnIndexOrThrow(key)));
    }
    for (String key : COORDINATES) {
      int index = cursor.getColumnIndexOrThrow(key);
      if (cursor.isNull(index)) {
        alert.putNull(key);
      } else {
        alert.putDouble(key, cursor.getDouble(index));
      }
    }
    alert.putDouble("createdAt", cursor.getLong(cursor.getColumnIndexOrThrow("createdAt")));
    return alert;
  }
}
