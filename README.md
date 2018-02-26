frontend-nanodegree-arcade-game
===============================

Students should use this [rubric](https://review.udacity.com/#!/projects/2696458597/rubric) for self-checking their submission. Make sure the functions you write are **object-oriented** - either class functions (like Player and Enemy) or class prototype functions such as Enemy.prototype.checkCollisions, and that the keyword 'this' is used appropriately within your class and class prototype functions to refer to the object the function is called upon. Also be sure that the **readme.md** file is updated with your instructions on both how to 1. Run and 2. Play your arcade game.

For detailed instructions on how to get started, check out this [guide](https://docs.google.com/document/d/1v01aScPjSWCCWQLIpFqvg3-vXLH2e8_SZQKC8jNO0Dc/pub?embedded=true).


TODO : 
 - add Map object which holds the background and has a render function, maybe an update function too?
 - get the engine to call this instead of doing it itself
 - Modify the player to account for water etc.
 - add a few other objects, Gem, Star, Heart.
 - tidy up the collision function to account for new objects 
 - Add a 'scene' or something which is a state machine to handle intro, playing a level
 - Add more than one map
 - Add a hud
 - Add a pause game
 - Check rubric
 - Complete README
 - sort git

 ------

 There two spaces, 'world' and 'grid'. All vectors are in grid space except the
 enemy which lives in world space, hence its ability to smoothly walk accross
 the screen (only the x coordinate is in world space really). Everything is
 drawn in screen space. Collisions between things which are in grid space, like
 the player and things which are in world space, the enemy, must be done in
 world space for them to make sense.

 Render asks object to give it the items world space coordinates which is easy
 fo most objects, only the enemy must convert before returning.

 Vectors are objects with an x and y property. Tiles have a location property which is a vector.