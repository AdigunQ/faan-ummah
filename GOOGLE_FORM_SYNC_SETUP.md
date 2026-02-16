# Google Form -> Cooperative App Sync Setup

This setup sends each Google Form submission to your app and creates a `PENDING` member for Admin approval.

## 1) Configure app environment (Railway + local)

Set these environment variables:

- `GOOGLE_FORM_WEBHOOK_SECRET`
- `MEMBER_EMAIL_DOMAIN` (optional, default `faan-ummah.coop`)
- `DEFAULT_MEMBER_PASSWORD` (optional, default `member123`)

Example endpoint used by Google:

`POST /api/integrations/google-form`

## 2) Google Apps Script (linked to your form response sheet)

Open the response sheet from your Google Form:

- Extensions -> Apps Script
- Paste script below
- Set `APP_URL` and `WEBHOOK_SECRET`
- Update field labels in `FORM_FIELDS` to match your exact form labels

```javascript
const APP_URL = 'https://cooperative-app-production-cd1b.up.railway.app';
const WEBHOOK_SECRET = 'REPLACE_WITH_YOUR_SECRET';

const FORM_FIELDS = {
  fullName: 'Full Name',
  staffId: 'Staff ID',
  department: 'Department',
  monthlySavings: 'Monthly Savings Amount',
  phoneNumber: 'Phone Number',
};

function firstValue(namedValues, key) {
  const value = namedValues[key];
  if (!value || !value.length) return '';
  return String(value[0]).trim();
}

function ensureColumn(sheet, header) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  let index = headers.indexOf(header);

  if (index === -1) {
    sheet.getRange(1, lastColumn + 1).setValue(header);
    index = lastColumn;
  }

  return index + 1; // 1-based
}

function onFormSubmit(e) {
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  const namedValues = e.namedValues || {};

  const statusCol = ensureColumn(sheet, 'Sync Status');
  const messageCol = ensureColumn(sheet, 'Sync Message');
  const syncedAtCol = ensureColumn(sheet, 'Synced At');

  const payload = {
    fullName: firstValue(namedValues, FORM_FIELDS.fullName),
    staffId: firstValue(namedValues, FORM_FIELDS.staffId),
    department: firstValue(namedValues, FORM_FIELDS.department),
    monthlySavings: firstValue(namedValues, FORM_FIELDS.monthlySavings),
    phoneNumber: firstValue(namedValues, FORM_FIELDS.phoneNumber),
    submissionId: `row-${row}`,
    submittedAt: new Date().toISOString(),
  };

  try {
    const response = UrlFetchApp.fetch(`${APP_URL}/api/integrations/google-form`, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-webhook-secret': WEBHOOK_SECRET,
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    const status = response.getResponseCode();
    const bodyText = response.getContentText() || '';

    if (status >= 200 && status < 300) {
      sheet.getRange(row, statusCol).setValue('SYNCED');
      sheet.getRange(row, messageCol).setValue(`HTTP ${status}`);
      sheet.getRange(row, syncedAtCol).setValue(new Date());
    } else {
      sheet.getRange(row, statusCol).setValue('FAILED');
      sheet.getRange(row, messageCol).setValue(`HTTP ${status}: ${bodyText.slice(0, 200)}`);
      sheet.getRange(row, syncedAtCol).setValue(new Date());
    }
  } catch (err) {
    sheet.getRange(row, statusCol).setValue('FAILED');
    sheet.getRange(row, messageCol).setValue(String(err).slice(0, 200));
    sheet.getRange(row, syncedAtCol).setValue(new Date());
  }
}
```

## 3) Add trigger

In Apps Script:

- Triggers -> Add Trigger
- Function: `onFormSubmit`
- Event source: `From spreadsheet`
- Event type: `On form submit`

## 4) Expected app behavior

On successful sync:

- Member is created in app with `status = PENDING`
- Member appears in `Dashboard -> Member Approvals`

If staff ID already exists:

- Existing non-active member is updated and kept as `PENDING`
- Existing active member is not re-created

## 5) Verify quickly

1. Submit a test Google Form response.
2. Check sheet `Sync Status` = `SYNCED`.
3. In app, open `Member Approvals` and verify the record appears.
