# n8n Workflow Backups

Exported JSON of the 2 Lumenfi n8n workflows for disaster recovery.

## Workflows

### 1. Image Daily Auto-post
- **ID**: `1tGkVRxO4eR5ASs8`
- **File**: `image-daily-autopost.json`
- **Schedule**: Every day 19:30 BKK
- **Nodes**: 15
- **Pipeline**: Pick Pillar → Gemini Caption → Parse → Gemini Image → Drive Upload → FB /photos → Webhook Lumenfi → Auto-comment (UTM tracked)

### 2. Reel Auto-post (Mon/Wed/Fri)
- **ID**: `jtYaJ2Jiqy14u3uJ`
- **File**: `reel-autopost.json`
- **Schedule**: Mon/Wed/Fri 12:00 BKK
- **Nodes**: 18
- **Avatar**: Naya (professional Asian businesswoman)
- **Pipeline**: Pick Pillar → Claude Script → Build → HeyGen Generate → Wait/Poll (max 5 retries) → FB /video_reels → Webhook Lumenfi → Auto-comment (UTM tracked)

## Credentials Required (n8n)

| Credential Name | Type | ID | Used By |
|---|---|---|---|
| Google Gemini(PaLM) Api account | googlePalmApi | hKkMbwpWCHg6BxuY | Gemini Caption, Gemini Image |
| Google Drive OAuth2 API | googleDriveOAuth2Api | of4PFzhLo3pPYFlu | Upload to Drive |
| FB Lumenfi Page | httpHeaderAuth | lQKb2s6KqO0fCMTJ | Post to Facebook, Reel Start/Upload/Finish, Post Comment |
| Lumenfi Webhook Secret | httpHeaderAuth | N0L0LUSJdigQ58HM | Webhook Lumenfi (both workflows) |
| Anthropic Header Auth | httpHeaderAuth | (user-created) | Claude Script (Reel only) |
| Heygen | httpHeaderAuth | 6muCRIF9OBsxiiTZ | HeyGen Generate/Status |

## Restore Procedure

If a workflow is accidentally deleted:
1. Open n8n → Import from File
2. Upload the JSON file from this directory
3. Re-attach credentials manually (n8n won't auto-map by ID from JSON)
4. Test with Execute Workflow
5. Publish → toggle Active

## Version

Last synced: **2026-07-04** — after UTM tracking + engagement-first caption prompt

## UTM Tracking Format

Auto-comments now include UTM params:
```
https://lumenfi.projectostech.com/signup?utm_source=facebook&utm_medium={image_comment|reel_comment}&utm_campaign={pillar}&utm_content={post_id}
```

Track in GA4 / Vercel Analytics to see which post drives most signups.
