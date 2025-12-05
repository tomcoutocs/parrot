#!/usr/bin/env node

/**
 * Email Configuration Checker
 * 
 * This script checks if your email configuration is set up correctly.
 * Run with: node scripts/check-email-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('📧 Checking Email Configuration...\n');

// Check for .env.local file
const envPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), '.env.example');

let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
} else if (fs.existsSync(envExamplePath)) {
  console.log('⚠️  .env.local not found, checking .env.example\n');
  envContent = fs.readFileSync(envExamplePath, 'utf-8');
} else {
  console.log('❌ No .env file found. Please create .env.local\n');
  process.exit(1);
}

// Check for required variables
const checks = [
  {
    name: 'RESEND_API_KEY',
    pattern: /RESEND_API_KEY=(.+)/,
    required: true,
    description: 'Resend API key (starts with re_)'
  },
  {
    name: 'FROM_EMAIL',
    pattern: /FROM_EMAIL=(.+)/,
    required: true,
    description: 'From email address (must be from verified domain)'
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    pattern: /NEXT_PUBLIC_APP_URL=(.+)/,
    required: false,
    description: 'Public app URL for email links'
  }
];

let allPassed = true;

checks.forEach(check => {
  const match = envContent.match(check.pattern);
  if (match) {
    const value = match[1].trim();
    if (value && value !== `your_${check.name.toLowerCase()}_here` && !value.includes('xxxxx')) {
      // Validate format
      if (check.name === 'RESEND_API_KEY' && !value.startsWith('re_')) {
        console.log(`⚠️  ${check.name}: Found but format may be incorrect (should start with 're_')`);
        allPassed = false;
      } else if (check.name === 'FROM_EMAIL' && !value.includes('@')) {
        console.log(`⚠️  ${check.name}: Found but format may be incorrect (should be an email address)`);
        allPassed = false;
      } else {
        console.log(`✅ ${check.name}: Configured`);
      }
    } else {
      if (check.required) {
        console.log(`❌ ${check.name}: Not configured (required)`);
        allPassed = false;
      } else {
        console.log(`⚠️  ${check.name}: Not configured (optional)`);
      }
    }
  } else {
    if (check.required) {
      console.log(`❌ ${check.name}: Not found (required)`);
      allPassed = false;
    } else {
      console.log(`⚠️  ${check.name}: Not found (optional)`);
    }
  }
});

console.log('\n📋 Next Steps:');
console.log('1. Get your Resend API key from https://resend.com/api-keys');
console.log('2. Add and verify your domain at https://resend.com/domains');
console.log('3. Add DNS records (SPF, DKIM, DMARC) as shown in Resend dashboard');
console.log('4. Set FROM_EMAIL to an email from your verified domain');
console.log('\n📚 For detailed instructions, see:');
console.log('   - docs/RESEND_SETUP.md');
console.log('   - docs/EMAIL_DELIVERABILITY.md');

if (allPassed) {
  console.log('\n✅ All required email configuration found!');
  console.log('⚠️  Remember to verify your domain in Resend dashboard.');
} else {
  console.log('\n❌ Some required configuration is missing.');
  console.log('   Please complete the setup steps above.');
  process.exit(1);
}

