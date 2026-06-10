# File Tree: backend

**Generated:** 4/1/2026, 1:50:50 PM
**Root Path:** `c:\Users\ASUS\Downloads\HomeyChef\backend`

backend
├── config
│   ├── database.js
│   └── syncDatabase.js
├── controllers
│   ├── authController.js
│   ├── cartController.js
│   ├── chefController.js
│   ├── dishController.js
│   ├── favoriteController.js
│   ├── notificationController.js
│   ├── orderController.js
│   ├── reviewController.js
│   ├── statisticsController.js
│   └── userController.js
├── middleware
│   └── auth.js
├── models
│   ├── Chef.js
│   ├── Dish.js
│   ├── Favorite.js
│   ├── Notification.js
│   ├── Order.js
│   ├── OrderItem.js
│   ├── PasswordReset.js
│   ├── Review.js
│   └── User.js
├── routes
│   ├── auth.js
│   ├── cart.js
│   ├── chefs.js
│   ├── dishes.js
│   ├── favorites.js
│   ├── notifications.js
│   ├── orders.js
│   ├── reviews.js
│   ├── statistics.js
│   └── users.js
├── services
│   └── notificationService.js
├── socket
│   └── notificationSocket.js
├── utils
│   └── mailer.js
├── views
│   ├── css
│   │   ├── admin-chefs.css
│   │   ├── admin-dishes.css
│   │   ├── admin-users.css
│   │   ├── chef-profile.css
│   │   ├── dashboard-admin.css
│   │   ├── dashboard-chef.css
│   │   ├── dashboard-user.css
│   │   ├── dishes.css
│   │   ├── favorites.css
│   │   ├── index.css
│   │   ├── login.css
│   │   ├── menu.css
│   │   ├── notifications.css
│   │   ├── orders.css
│   │   ├── password-auth.css
│   │   ├── register.css
│   │   └── statistics.css
│   ├── js
│   │   ├── admin-chefs.js
│   │   ├── admin-dishes.js
│   │   ├── admin-users.js
│   │   ├── auth.js
│   │   ├── change-password.js
│   │   ├── chef-profile.js
│   │   ├── dashboard-admin.js
│   │   ├── dashboard-chef.js
│   │   ├── dashboard-user.js
│   │   ├── dishes.js
│   │   ├── favorites.js
│   │   ├── forgot-password.js
│   │   ├── index.js
│   │   ├── login.js
│   │   ├── menu.js
│   │   ├── navbar.js
│   │   ├── notification-client.js
│   │   ├── notifications.js
│   │   ├── orders.js
│   │   ├── reset-password.js
│   │   ├── social-auth.js
│   │   ├── statistics.js
│   │   └── utils.js
│   ├── admin-chefs.html
│   ├── admin-dishes.html
│   ├── admin-users.html
│   ├── change_password.html
│   ├── chef-profile.html
│   ├── dashboard-admin.html
│   ├── dashboard-chef.html
│   ├── dashboard-user.html
│   ├── dishes.html
│   ├── favorites.html
│   ├── forgot_password.html
│   ├── index.html
│   ├── login.html
│   ├── menu.html
│   ├── notifications.html
│   ├── orders.html
│   ├── register.html
│   ├── reset_password.html
│   └── statistics.html
├── .env.example
├── .gitignore
├── package-lock.json
├── package.json
└── server.js
homeychef_mobile
├── android
│   ├── app
│   │   ├── src
│   │   │   ├── debug
│   │   │   │   └── AndroidManifest.xml
│   │   │   ├── main
│   │   │   │   ├── java
│   │   │   │   │   └── io
│   │   │   │   │       └── flutter
│   │   │   │   │           └── plugins
│   │   │   │   │               └── GeneratedPluginRegistrant.java
│   │   │   │   ├── kotlin
│   │   │   │   │   └── com
│   │   │   │   │       └── example
│   │   │   │   │           └── homeychef_mobile
│   │   │   │   │               └── MainActivity.kt
│   │   │   │   ├── res
│   │   │   │   │   ├── drawable
│   │   │   │   │   │   └── launch_background.xml
│   │   │   │   │   ├── drawable-v21
│   │   │   │   │   │   └── launch_background.xml
│   │   │   │   │   ├── mipmap-hdpi
│   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   ├── mipmap-mdpi
│   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   ├── mipmap-xhdpi
│   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   ├── mipmap-xxhdpi
│   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   ├── mipmap-xxxhdpi
│   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   ├── values
│   │   │   │   │   │   └── styles.xml
│   │   │   │   │   └── values-night
│   │   │   │   │       └── styles.xml
│   │   │   │   └── AndroidManifest.xml
│   │   │   └── profile
│   │   │       └── AndroidManifest.xml
│   │   └── build.gradle.kts
│   ├── gradle
│   │   └── wrapper
│   │       ├── gradle-wrapper.jar
│   │       └── gradle-wrapper.properties
│   ├── .gitignore
│   ├── build.gradle.kts
│   ├── gradle.properties
│   ├── gradlew
│   ├── gradlew.bat
│   ├── local.properties
│   └── settings.gradle.kts
├── ios
│   ├── Flutter
│   │   ├── ephemeral
│   │   │   ├── Packages
│   │   │   │   ├── .packages
│   │   │   │   └── FlutterGeneratedPluginSwiftPackage
│   │   │   │       ├── Sources
│   │   │   │       │   └── FlutterGeneratedPluginSwiftPackage
│   │   │   │       │       └── FlutterGeneratedPluginSwiftPackage.swift
│   │   │   │       └── Package.swift
│   │   │   ├── flutter_lldb_helper.py
│   │   │   ├── flutter_lldbinit
│   │   │   └── flutter_native_integration.env
│   │   ├── AppFrameworkInfo.plist
│   │   ├── Debug.xcconfig
│   │   ├── Generated.xcconfig
│   │   ├── Release.xcconfig
│   │   └── flutter_export_environment.sh
│   ├── Runner
│   │   ├── Assets.xcassets
│   │   │   ├── AppIcon.appiconset
│   │   │   │   ├── Contents.json
│   │   │   │   ├── Icon-App-1024x1024@1x.png
│   │   │   │   ├── Icon-App-20x20@1x.png
│   │   │   │   ├── Icon-App-20x20@2x.png
│   │   │   │   ├── Icon-App-20x20@3x.png
│   │   │   │   ├── Icon-App-29x29@1x.png
│   │   │   │   ├── Icon-App-29x29@2x.png
│   │   │   │   ├── Icon-App-29x29@3x.png
│   │   │   │   ├── Icon-App-40x40@1x.png
│   │   │   │   ├── Icon-App-40x40@2x.png
│   │   │   │   ├── Icon-App-40x40@3x.png
│   │   │   │   ├── Icon-App-60x60@2x.png
│   │   │   │   ├── Icon-App-60x60@3x.png
│   │   │   │   ├── Icon-App-76x76@1x.png
│   │   │   │   ├── Icon-App-76x76@2x.png
│   │   │   │   └── Icon-App-83.5x83.5@2x.png
│   │   │   └── LaunchImage.imageset
│   │   │       ├── Contents.json
│   │   │       ├── LaunchImage.png
│   │   │       ├── LaunchImage@2x.png
│   │   │       ├── LaunchImage@3x.png
│   │   │       └── README.md
│   │   ├── Base.lproj
│   │   │   ├── LaunchScreen.storyboard
│   │   │   └── Main.storyboard
│   │   ├── AppDelegate.swift
│   │   ├── GeneratedPluginRegistrant.h
│   │   ├── GeneratedPluginRegistrant.m
│   │   ├── Info.plist
│   │   ├── Runner-Bridging-Header.h
│   │   └── SceneDelegate.swift
│   ├── Runner.xcodeproj
│   │   ├── project.xcworkspace
│   │   │   ├── xcshareddata
│   │   │   │   ├── IDEWorkspaceChecks.plist
│   │   │   │   └── WorkspaceSettings.xcsettings
│   │   │   └── contents.xcworkspacedata
│   │   ├── xcshareddata
│   │   │   └── xcschemes
│   │   │       └── Runner.xcscheme
│   │   └── project.pbxproj
│   ├── Runner.xcworkspace
│   │   ├── xcshareddata
│   │   │   ├── IDEWorkspaceChecks.plist
│   │   │   └── WorkspaceSettings.xcsettings
│   │   └── contents.xcworkspacedata
│   ├── RunnerTests
│   │   └── RunnerTests.swift
│   └── .gitignore
├── lib
│   └── main.dart
├── test
│   └── widget_test.dart
├── .gitignore
├── .metadata
├── README.md
├── analysis_options.yaml
├── pubspec.lock
└── pubspec.yaml
```

---
*Generated by FileTree Pro Extension*