#!/bin/bash

# Preview: list files that would be deleted
echo "The following files would be deleted:"
find ./output -maxdepth 1 -type f ! -name '*.tex' -exec echo '{}' \;

# Ask for confirmation
read -p "Do you want to delete these files? (y/n): " choice
if [[ "$choice" == [Yy] ]]; then
    find ./output -maxdepth 1 -type f ! -name '*.tex' -exec rm -- '{}' +
    echo "Files deleted."
else
    echo "No files deleted."
fi
