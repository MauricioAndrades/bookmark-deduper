# bookmark deduper #

I wanted to a custom bookmark deduper that could handle thousands of links quickly, and would work with links across different files and folders. So I created this package. 

I've tested it with 9K+ bookmarks.

It works by converting a bookmarks.html file into an array of objects. Dedupes the objects by `href` and formats the titles to a standard max length with title case.
