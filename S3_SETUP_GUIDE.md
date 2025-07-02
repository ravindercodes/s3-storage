# S3 Drive Setup Guide

This guide will help you set up an Amazon S3 bucket and configure the necessary IAM policies to use with S3 Drive.

## Prerequisites

- An AWS account
- Basic understanding of AWS services
- Administrative access to AWS Console

## Step 1: Create an S3 Bucket

### 1.1 Navigate to S3 Console
1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/)
2. Navigate to **S3** service
3. Click **"Create bucket"**

### 1.2 Configure Bucket Settings
1. **Bucket name**: Choose a globally unique name (e.g., `my-s3-drive-bucket-2025`)
2. **AWS Region**: Select your preferred region (closer to your location for better performance)
3. **Object Ownership**: Select **"ACLs enabled"** and **"Bucket owner preferred"**
4. **Block Public Access**: Keep all options **CHECKED** (recommended for security)
5. **Bucket Versioning**: Enable if you want version control (optional)
6. **Default encryption**: Enable **Server-side encryption with Amazon S3 managed keys (SSE-S3)**
7. Click **"Create bucket"**

## Step 2: Configure CORS (Cross-Origin Resource Sharing)

### 2.1 Set up CORS Policy
1. Go to your newly created bucket
2. Click on the **"Permissions"** tab
3. Scroll down to **"Cross-origin resource sharing (CORS)"**
4. Click **"Edit"** and paste the following configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "PUT",
            "POST",
            "DELETE",
            "HEAD"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "ETag",
            "x-amz-meta-custom-header"
        ]
    }
]
```

5. Click **"Save changes"**

> **Note**: For production use, replace `"*"` in `AllowedOrigins` with your specific domain (e.g., `"https://yourdomain.com"`)

## Step 3: Create IAM User and Policy

### 3.1 Create IAM Policy
1. Navigate to **IAM** service in AWS Console
2. Click **"Policies"** in the left sidebar
3. Click **"Create policy"**
4. Choose **"JSON"** tab
5. Replace the default policy with the following:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3DriveFullAccess",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket",
                "s3:GetObjectVersion",
                "s3:DeleteObjectVersion",
                "s3:ListBucketVersions",
                "s3:GetBucketLocation",
                "s3:AbortMultipartUpload",
                "s3:ListMultipartUploadParts",
                "s3:ListBucketMultipartUploads"
            ],
            "Resource": [
                "arn:aws:s3:::YOUR_BUCKET_NAME",
                "arn:aws:s3:::YOUR_BUCKET_NAME/*"
            ]
        }
    ]
}
```

6. **Replace `YOUR_BUCKET_NAME`** with your actual bucket name
7. Click **"Next: Tags"** (optional)
8. Click **"Next: Review"**
9. **Policy name**: `S3DrivePolicy`
10. **Description**: `Policy for S3 Drive application access`
11. Click **"Create policy"**

### 3.2 Create IAM User
1. In IAM Console, click **"Users"** in the left sidebar
2. Click **"Add users"**
3. **User name**: `s3-drive-user`
4. **Access type**: Select **"Programmatic access"**
5. Click **"Next: Permissions"**
6. Select **"Attach existing policies directly"**
7. Search for `S3DrivePolicy` and check the box
8. Click **"Next: Tags"** (optional)
9. Click **"Next: Review"**
10. Click **"Create user"**

### 3.3 Save Credentials
⚠️ **IMPORTANT**: Save the following credentials immediately (they won't be shown again):
- **Access Key ID**: `AKIA...`
- **Secret Access Key**: `wJalrXUtn...`

## Step 4: Configure S3 Drive Application

### 4.1 Enter Credentials in S3 Drive
1. Open your S3 Drive application
2. Click the **Settings** gear icon
3. Enter the following information:
   - **Access Key ID**: Your IAM user's Access Key ID
   - **Secret Access Key**: Your IAM user's Secret Access Key
   - **Region**: The region where you created your bucket (e.g., `us-east-1`)
   - **Bucket Name**: Your bucket name

### 4.2 Test Connection
1. Click **"Save"** to test the connection
2. If successful, you should see your bucket contents (empty initially)

## Step 5: Security Best Practices

### 5.1 Enable MFA for IAM User (Recommended)
1. Go to IAM → Users → Select your user
2. Go to **"Security credentials"** tab
3. Click **"Manage"** next to "Assigned MFA device"
4. Follow the setup process

### 5.2 Rotate Access Keys Regularly
1. Create a new access key
2. Update your application with the new key
3. Test the application
4. Delete the old access key

### 5.3 Monitor Usage
1. Enable **CloudTrail** for API logging
2. Set up **CloudWatch** alarms for unusual activity
3. Regularly review **Access Advisor** in IAM

## Step 6: Optional Advanced Configuration

### 6.1 Enable Bucket Notifications (Optional)
If you want real-time notifications:
1. Go to your bucket → **Properties** tab
2. Scroll to **"Event notifications"**
3. Configure as needed

### 6.2 Set up Lifecycle Policies (Optional)
To manage storage costs:
1. Go to your bucket → **Management** tab
2. Click **"Create lifecycle rule"**
3. Configure automated transitions to cheaper storage classes

### 6.3 Enable Transfer Acceleration (Optional)
For faster uploads from distant locations:
1. Go to your bucket → **Properties** tab
2. Find **"Transfer acceleration"**
3. Click **"Edit"** and enable it

## Troubleshooting

### Common Issues and Solutions

#### 1. Access Denied Errors
- Verify your IAM policy includes all required permissions
- Check that the bucket name in the policy matches exactly
- Ensure CORS is properly configured

#### 2. CORS Errors
- Verify CORS configuration in your bucket
- Check that your domain is included in `AllowedOrigins`
- Clear browser cache and try again

#### 3. Upload Failures
- Check if the bucket has sufficient space
- Verify multipart upload permissions in IAM policy
- Ensure the bucket is in the correct region

#### 4. Connection Issues
- Verify Access Key ID and Secret Access Key
- Check the region setting
- Ensure IAM user has programmatic access enabled

## Cost Optimization Tips

1. **Use Intelligent Tiering**: Automatically moves objects between access tiers
2. **Enable Compression**: Compress files before uploading when possible
3. **Monitor Usage**: Use AWS Cost Explorer to track spending
4. **Delete Incomplete Multipart Uploads**: Set up lifecycle rules to clean these up
5. **Use Appropriate Storage Classes**: Standard for frequently accessed, IA for less frequent

## Security Checklist

- [ ] Bucket public access is blocked
- [ ] CORS is configured with specific origins (not "*")
- [ ] IAM policy follows principle of least privilege
- [ ] MFA is enabled for IAM user
- [ ] Access keys are rotated regularly
- [ ] CloudTrail logging is enabled
- [ ] Bucket encryption is enabled
- [ ] Regular security audits are performed

## Support

If you encounter issues:
1. Check the browser console for specific error messages
2. Verify all settings match this guide exactly
3. Test with AWS CLI to isolate issues
4. Review AWS CloudTrail logs for detailed error information

---

**Need Help?** 
- AWS Documentation: https://docs.aws.amazon.com/s3/
- AWS Support: https://aws.amazon.com/support/
- S3 Drive GitHub Issues: [Your repository URL]

**Security Warning**: Never commit your AWS credentials to version control or share them publicly!
