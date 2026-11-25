# Arise as a real iPhone app (Xcode)

This folder holds Arise as a native iPhone app. You open it in Xcode on a Mac and install it on your iPhone over a cable. You don't need any coding, Terminal, or paid account.

## What you need

- A Mac with **Xcode**. Xcode is free in the Mac App Store and is a large download, so start it early.
- Your **iPhone** and its charging cable.
- Your **Apple ID**, the same one you use for the App Store.
- An internet connection. The first time you open the project, Xcode downloads a few small parts.

## One-time setup (about 15 minutes)

**1. Open the project**
- Double-click `Arise-iPhone-<version>.zip` to unzip it.
- Open the folder **Arise-iPhone**, then **ios**, then **App**.
- Double-click **App.xcodeproj**. Xcode opens.
- Wait until the bar at the top stops saying "Fetching" or "Resolving packages". The first time, this takes 1 to 3 minutes.

**2. Sign the app with your Apple ID**
- In the left column, click the blue **App** icon at the very top.
- In the middle area, under **TARGETS**, click **App**. Then open the **Signing & Capabilities** tab.
- Tick **Automatically manage signing**.
- Under **Team**, choose **Add an Account…** and sign in with your Apple ID.
- Pick the team named **Your Name (Personal Team)**.
- If a red message says the bundle identifier is "not available", change **Bundle Identifier** to something unique, such as `in.guruprasad.arise`, and press Enter.

**3. Connect your iPhone**
- Plug the iPhone into the Mac and unlock it. If the phone asks, tap **Trust This Computer**.
- Turn on Developer Mode on the iPhone: open **Settings**, then **Privacy & Security**, then **Developer Mode**, and switch it on. The iPhone restarts.
  - The Developer Mode switch only appears after the iPhone has been connected to Xcode once. If you don't see it yet, do step 4 first, then come back here.

**4. Install Arise**
- At the top of the Xcode window, open the device menu (it shows a device name such as "iPhone 16") and choose **your own iPhone**.
- Press the **Play button** (or press Command and R together). Xcode builds the app and puts it on your phone.
- The first time only, the iPhone refuses to open the app until you trust yourself as its developer. On the iPhone, open **Settings**, then **General**, then **VPN & Device Management**. Tap your Apple ID and tap **Trust**.
- Now tap **Arise** on your Home Screen.

**5. Turn on reminders**
- In Arise, tap the **bell** at the top of Today, tap **Turn on notifications**, then tap **Allow**.

## Moving your data from the Safari version

The iPhone app keeps its own data, separate from the version you added from Safari. To bring your data across:

1. Open the **old** Arise (the Safari home-screen icon). Go to **Settings**, tap **Save backup**, and save the file to **Files**, for example in "On My iPhone".
2. Open the **new** Arise app. Go to **Settings**, tap **Restore**, and choose that backup file.

Once everything is there, you can delete the old Safari icon if you like. Press and hold it, then tap **Remove App**.

## Good to know

- **7-day limit with a free Apple ID.** Apple lets an app installed this way open for 7 days. After that, connect the iPhone, open the project in Xcode, and press **Play** again. Your data stays on the phone.
- **The paid Apple Developer Program** costs USD 99 a year. It raises the limit to one year and lets you use TestFlight or the App Store. It isn't needed. Ask Claude before going that way.
- **Reminders work with the app closed.** Arise books the next three days of reminders with iOS, so they arrive even when the app isn't open. Open Arise once every day or two to keep them topped up. When a focus session ends, iOS alerts you too.
- **Sharing and saving.** Export, backup and document sharing open the normal iPhone share sheet. From there you can use Mail, WhatsApp, or **Save to Files**.
- **Updates.** When Arise gets a new version, you'll receive a new zip. Open it the same way and press Play. Use the same Bundle Identifier as before and your data is kept.
- **Your data stays on your phone.** Nothing is uploaded anywhere.

## If something goes wrong

- **"Untrusted Developer"**: on the iPhone, go to **Settings**, then **General**, then **VPN & Device Management**, and tap **Trust**.
- **"Developer Mode disabled"**: see step 3.
- **The iPhone is not in the device menu**: unplug the cable and plug it back in, unlock the phone, and tap **Trust**.
- **Signing errors in red**: check that **Team** shows your Personal Team, and try another Bundle Identifier.
- **"Failed to resolve packages"**: make sure the Mac is online. Then, in the top menu, choose **File**, then **Packages**, then **Reset Package Caches**.
