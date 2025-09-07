#!/usr/bin/env node

// Simple build test script
console.log('🔨 Testing build process...');

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
    // Check if package.json exists
    if (!fs.existsSync('package.json')) {
        throw new Error('package.json not found');
    }

    // Check if src directory exists
    if (!fs.existsSync('src')) {
        throw new Error('src directory not found');
    }

    // Check if public directory exists
    if (!fs.existsSync('public')) {
        throw new Error('public directory not found');
    }

    console.log('✅ All required files and directories found');

    // Try to run the build
    console.log('🔨 Running build...');
    execSync('npm run build', { stdio: 'inherit' });

    // Check if build directory was created
    if (fs.existsSync('build')) {
        console.log('✅ Build successful! Build directory created.');

        // Check if index.html exists in build
        if (fs.existsSync(path.join('build', 'index.html'))) {
            console.log('✅ index.html found in build directory');
        } else {
            console.log('❌ index.html not found in build directory');
        }
    } else {
        console.log('❌ Build failed! Build directory not created.');
    }

} catch (error) {
    console.error('❌ Build test failed:', error.message);
    process.exit(1);
}
