fs.watch Notes
==============

## Watching a directory `a_dir`

### Mac

1. if add a new file `two.txt`, fires `rename two.txt`
2. if rename a file `one.txt` to `three.txt`, fires `rename one.txt` and `rename three.txt`
3. if remove a file `two.txt`, fires `rename two.txt`

### Windows 7

1. if add a new file `two.txt`, fires `rename two.txt`
2. if rename af file `one.txt` to `three.txt`, fires `rename null`, `rename three.txt`, `change three.txt`
3. if remove a file `three.txt`, fires `rename null`

### Windows XP

1. if add a new file `two.txt`, fires `rename two.txt`
2. if renaming a file `a_dir/one.txt` to `a_dir/three.txt`, fires `rename null`, `rename three.txt`, `change three.txt`
4. if removing `a_dir/one.txt`, fires `rename null`

### Linux

1. if add a new file `two.txt`, fires `rename two.txt` `change two.txt`
2. if rename a file `one.txt` to `three.txt`, fires `rename one.txt` and `rename three.txt`
3. if remove a file `two.txt`, fires `rename two.txt`

## Watching a file `a_dir/one.txt`

### Mac

1. if touching a file, fires `change null`
2. if renaming a file `a_dir/one.txt` to `a_dir/three.txt`, fires `rename null`
3. if renaming from the renamed name `a_dir/three.txt` to `a_dir/two.txt`, fires `rename null`
4. if removing file, fires `rename null`
5. if moving another file to the name of the watched file, nothing fires

### Windows 7

1. if touching a file `a_dir/one.txt` fires `change one.txt`
2. if renaming a file `a_dir/one.txt` to `a_dir/three.txt`, fires `rename one.txt`
3. if renaming from the renamed name `a_dir/three.txt` to `a_dir/two.txt`, nothing fires
4. if moving file of name `a_dir/two.txt` back to `a_dir/one.txt`, fires `change one.txt`
5. if removing file `a_dir/one.txt`, fires `rename one.txt`

### Windows XP

1. if touching a file `a_dir/one.txt` fires `change one.txt`
2. if renaming a file `a_dir/one.txt` to `a_dir/three.txt`, fires `rename one.txt`
3. if renaming from the renamed name `a_dir/three.txt` to `a_dir/two.txt`, nothing fires
4. if moving file of name `a_dir/two.txt` back to `a_dir/one.txt`, fires `rename one.txt`, `change one.txt`
5. if removing file `a_dir/one.txt`, fires `rename one.txt`

### Linux

1. if touching a file `one.txt`, fires `change one.txt`
2. if renaming a file `a_dir/one.txt` to `a_dir/three.txt`, fires `rename one.txt`
3. if renaming from the renamed name `a_dir/three.txt` to `a_dir/two.txt`, fires `rename one.txt`
4. if removing a file 'one.txt', fires `change one.txt`, `rename one.txt` and `rename one.txt`
5. if moving another file to the name of the watched file, nothing fires

## The plan

To figure out whether a file under watch was renamed, or removed, or modified:

1. if a file watch event fires, stat the file
  1. if the file no longer exists, it was removed or renamed(but don't know which)
  2. if the file exists and modification timestamp is later than in the cache, it was modified
  3. if also got renamed event from the directory watcher, can we match up to the original file?

To figure out whether a newly created file should be put under watch:

1. if a directory watch event fires, if filename is present, check if we want to watch that file, if so, stat that file, put a watcher on it
2. 

