# X Scraper Extension

A Chrome extension for scraping likes on X (Twitter) posts and randomly selecting users from the list.

## Features

- Scrape likers from any X/Twitter post
- Store the list of likers
- Randomly select a user from the collected likers
- Copy selected usernames to your clipboard with one click

## Installation Instructions

### Step 1: Download the Extension

1. Click the green "Code" button at the top of this page
2. Select "Download ZIP"
3. Once downloaded, find the ZIP file in your Downloads folder
4. Extract the ZIP file:
   - On Windows: Right-click the file and select "Extract All"
   - On Mac: Double-click the ZIP file
   - On Chrome OS: Files app will automatically extract it when you click on it

### Step 2: Add to Chrome

1. Open Chrome browser
2. Type `chrome://extensions` in the address bar and press Enter
3. In the top-right corner, turn on "Developer mode" (toggle switch)
4. Click the "Load unpacked" button that appears
5. Navigate to the extracted folder from Step 1
6. Click "Select Folder"
7. You should see "X Scraper" appear in your extensions list

![Developer mode toggle](https://i.imgur.com/8eRyTVA.png)
![Load unpacked button](https://i.imgur.com/z5WwZwM.png)

### Step 3: Using the Extension

1. Go to any tweet on X (Twitter)
2. You'll see a blue "Scrape Likers" button in the top-right corner
3. Click it, and it will take you to the likes page
4. On the likes page, you'll see a green "Begin Scrape" button
5. Click it to start collecting likes (the button will change to "Scrolling...")
6. When finished, click the extension icon in your browser toolbar
7. Click "Pick Random Mutual" to randomly select one of the likers
8. The selected user handle will be copied to your clipboard automatically

## Updating the Extension

When updates are available:

1. Download the latest code using the same method above
2. Go to `chrome://extensions`
3. Find and remove the old X Scraper extension
4. Click "Load unpacked" and select the new folder

## Common Issues and Troubleshooting

If the extension doesn't appear to work:

1. Make sure you're on X.com (formerly Twitter)
2. Try refreshing the page
3. Make sure the extension is enabled in `chrome://extensions`
4. Check that Developer mode is still turned on
5. If all else fails, try removing and reinstalling using the steps above

## Settings

The extension has a toggle switch to enable/disable auto-scraping. When disabled, it won't automatically prepare for scraping when you visit a tweet.

## Need Help?

If you have any trouble installing or using the extension:
1. Open an issue in this repository
2. Send me a direct message
3. We can also set up a quick screen-sharing call if needed

## Privacy & Data

This extension:
- Only collects data from X.com (Twitter)
- Stores data locally in your browser only
- Never sends your data to any external servers
- Only runs when you're on X.com websites

## License

MIT License - See LICENSE file for details