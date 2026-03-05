# parameters
even n for size
triangle height h for ui


## internal representation

the board data structure is n rows by 2*n-1 columns. cells are numbered 1 to sequentially up. each cell also has an orientation which is 0 to 5 (every step is 60 degrees)


the available operations are rotations at specific borders:
- every odd row (1st, 3rd, ...) you can rotate at the bottom border of every even column (2nd, 4th, 6th)
- every even row except last, (2nd, 4th, ... not nth) you can rotate at bottom border of every odd column except first and last (3rd, 5th, ..., not 2n-1 th)

the rotatoin rotates 6 cells -> the 3 above that border (just above, left to that, right to that) and the 3 below that border (just below, left to that, right to that). the rotation cycles the cells but also adds 1 to their orientation modulo 6. 

## ui presentation

the n by 2n - 1 grid will be shown as a tesselation of equilateral triangles. location (r, c) will be
- if r is odd: every odd c will be upright triangle and every even c will be upside down triangle
- if r is even: every odd c will be up side triangle and every even c will be upright triangle

the rotation points are no longer a wide border, but rather a corner of 6 triangles

the labels will have a underline. the label + underline will rotate according to rotation. orientation o means they will be rotated o * 60 degrees clockwise