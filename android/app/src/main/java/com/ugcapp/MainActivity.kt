package com.ugcapp

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /** Installs the launch splash, then draws edge-to-edge and pads by the system insets. */
  override fun onCreate(savedInstanceState: Bundle?) {
    installSplashScreen()
    super.onCreate(savedInstanceState)
    setTheme(R.style.AppTheme)
    applySystemBarInsets()
  }

  /**
   * targetSdk 35+ forces edge-to-edge (and `adjustResize` no longer resizes). To keep the
   * website's CSS env(safe-area-inset-*) at 0 inside the WebView, the whole content view is
   * padded by status bar + navigation bar + display cutout + keyboard, so the page lays out
   * exactly like a normal full-screen web page and the keyboard pushes the page up.
   * Same code on every API level: the decor never fits system windows, we do it ourselves.
   */
  private fun applySystemBarInsets() {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    window.statusBarColor = Color.TRANSPARENT
    window.navigationBarColor = Color.TRANSPARENT
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.isNavigationBarContrastEnforced = false
    }
    // Light brand background: dark status/navigation bar icons.
    WindowCompat.getInsetsController(window, window.decorView).apply {
      isAppearanceLightStatusBars = true
      isAppearanceLightNavigationBars = true
    }
    val content = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
      val types =
          WindowInsetsCompat.Type.systemBars() or
              WindowInsetsCompat.Type.displayCutout() or
              WindowInsetsCompat.Type.ime()
      val bars = insets.getInsets(types)
      view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      WindowInsetsCompat.CONSUMED
    }
    ViewCompat.requestApplyInsets(content)
  }

  /** Name registered in index.js (AppRegistry) / app.json. */
  override fun getMainComponentName(): String = "ugcadapp"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
