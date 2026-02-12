# Client Testing Steps (Demo)

Use these steps if you are seeing this app for the first time and want to verify the main admin flows end-to-end.

## 0) Open The App + Login (Admin)

1. Open the app link you were provided.
2. Click **Login**.
3. Sign in with:
   - **Email:** `admin@coop.com`
   - **Password:** `admin123`

You should land on the Admin dashboard.

## 1) Approve New Members (Required)

1. In the left menu, click **Member Approvals**.
   - If you see a small **red number badge**, that is the count of pending members.
2. You will see **5 pending members** waiting for approval.
3. Click **Approve** for each pending member.
4. When done, the list should become empty (or reduce to 0), and the red badge should disappear.

## 2) Update A Member Profile (Required)

1. In the left menu, click **Update Member**.
2. Find and click the member named **Praise Eshue**.
3. On the member profile editor page, change any of these fields:
   - Monthly Savings Amount
   - Savings Balance
   - Loan Status Amount (Outstanding)
   - Account Status
4. Click **Save Manual Update**.
5. Confirm you see the green message: **“Saved changes for Praise Eshue.”**
6. Click **Back to Directory** to return to the list.

## 3) Generate The Monthly Report (Required)

1. In the left menu, click **Finance Monthly Report**.
2. Review:
   - Savings Deduction Total
   - Loan Deduction Total
   - Members with Loan Deductions
3. Scroll down to see the detailed tables for savings deductions and loan deductions.

## (Optional) Export Voucher CSV

1. In the left menu, click **Generate Voucher**.
2. Select a voucher period (Month) at the top.
3. Click **Generate CSV** to download the voucher file.
4. Open the CSV in Excel/Google Sheets and confirm the format matches the voucher template.

