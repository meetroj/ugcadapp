# Release builds are minified (R8). React Native / Hermes / AndroidX ship their own consumer
# rules; the entries below cover what this shell adds on top.

# react-native-webview: the JS bridge is a @JavascriptInterface and must keep its names.
-keep class com.reactnativecommunity.webview.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface, *Annotation*, Signature, InnerClasses, EnclosingMethod

# Firebase Messaging / Google Play services / Google Sign-In
-keep class io.invertase.firebase.** { *; }
-dontwarn io.invertase.firebase.**
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
-keep class com.reactnativegooglesignin.** { *; }

# AsyncStorage (Room generated code)
-keep class androidx.room.** { *; }
-dontwarn androidx.room.**
