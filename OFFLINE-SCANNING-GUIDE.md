# PrintPress Inventory Management System - Offline Scanning Guide

## Introduction

This guide explains how to use the offline scanning functionality in the PrintPress Inventory Management System mobile app. This feature allows you to scan QR codes and barcodes, view inventory details, and make inventory adjustments even when you don't have an internet connection.

## How Offline Scanning Works

The offline scanning functionality works by:

1. **Caching inventory data**: When you're online, the app automatically downloads and stores your inventory data to your device.
2. **Scanning without internet**: When offline, the app uses your device's camera to scan QR codes and barcodes.
3. **Looking up in local cache**: The app searches your cached inventory data to find matching items.
4. **Storing inventory changes**: Any inventory adjustments you make while offline are saved locally.
5. **Syncing when reconnected**: When you regain internet connectivity, all pending inventory changes are automatically synced with the server.

## Using Offline Scanning

### Before Going Offline

To prepare for offline scanning:

1. **Open the app while online**: Ensure you have a good internet connection.
2. **Navigate to different sections**: Visit the "Materials" and "Inventory" pages to ensure the app has cached the latest data.
3. **Check connection status**: The app will show "Online Mode" in the Scan page when you're connected.

### Scanning Items Offline

To scan items when offline:

1. **Access the Scan page**: Open the app and go to the "Scan" page.
2. **Verify offline status**: You'll see an "Offline Mode - Using Cached Data" indicator.
3. **Start scanning**: Tap "Start Camera" to activate the scanner.
4. **Scan a QR code or barcode**: Position the code inside the scanning frame.
5. **View item details**: The app will display item information from the local cache.

### Updating Inventory Offline

To update inventory quantities while offline:

1. **After scanning an item**: The item details will display with current stock level.
2. **Set quantity**: Use the + and - buttons to adjust the quantity.
3. **Add or remove**: Tap "Add (+)" or "Remove (-)" to update the inventory.
4. **Confirmation**: You'll see a message confirming the offline update.

### Manual Entry

If scanning doesn't work, you can manually enter codes:

1. **Use the manual entry section**: At the bottom of the Scan page.
2. **Enter the barcode or SKU**: Type the code in the input field.
3. **Tap "Search"**: The app will look for matching items in the local cache.

## Troubleshooting

### Common Issues

- **"Not found in offline cache"**: The item you scanned hasn't been cached. Try scanning when online first.
- **Camera won't start**: Ensure you've granted camera permissions to the app.
- **Scan not detecting**: Make sure the QR code or barcode is well-lit and positioned properly in the scanning frame.

### Syncing Problems

If you encounter syncing issues when going back online:

1. **Check connection**: Ensure you have a stable internet connection.
2. **Manual sync**: Go to Settings and tap "Sync Offline Data" if available.
3. **Restart the app**: Close and reopen the app to trigger sync.

## Technical Details

- **Data storage**: The app uses IndexedDB to securely store inventory data on your device.
- **Offline quota**: Most devices allow up to 50MB of offline storage, which is sufficient for thousands of inventory items.
- **Sync mechanism**: The app uses Background Sync API when available, with fallback mechanisms on unsupported browsers.

## Limitations

Please be aware of these limitations:

- **New items**: You cannot add completely new inventory items while offline.
- **Data freshness**: Offline data is only as current as your last online session.
- **Complex operations**: Some advanced inventory operations may only be available online.
- **Storage limits**: Very large inventories might not be fully cached (though this is rare).

## Getting Help

If you encounter any issues with offline scanning, please:

1. **Check this guide**: Review the troubleshooting section.
2. **Contact support**: Email support@printpress.com with details about your issue.
3. **Provide details**: Include what you were doing, what happened, and any error messages you saw.

---

*Last updated: August 2023* 