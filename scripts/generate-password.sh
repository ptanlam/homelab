#!/bin/bash

# Script to generate hashed password for Debian preseed file
# Usage: ./generate-password.sh [password]

PASSWORD=${1:-"debian123"}

echo "Generating hashed password for: $PASSWORD"
echo ""

# Generate SHA-512 hash
HASHED_PASSWORD=$(openssl passwd -6 -salt $(openssl rand -base64 6) "$PASSWORD")

echo "Hashed password: $HASHED_PASSWORD"
echo ""
echo "Replace the password lines in preseed/debian-12.cfg with:"
echo "d-i passwd/root-password-crypted password $HASHED_PASSWORD"
echo "d-i passwd/user-password-crypted password $HASHED_PASSWORD"
echo ""
echo "Or update the preseed file automatically:"
echo "sed -i 's/\$6\$rounds=656000\$salt\$hashedpassword/$HASHED_PASSWORD/g' preseed/debian-12.cfg"
