const area = { width: 5 * 101, height: 6 * 83, rows: 6, cols: 5 }
const block = { width: 101, height: 83 };
const canvas = { width: 505, height: 606 };

function clamp(n, min, max) {
    //ensure a value min or greater and max or smaller
    let r = n < min ? min : n;
    r = r > max ? max : r;
    return r;
}

// Enemies our player must avoid
var Enemy = function (row, speed, dir) {
    // Variables applied to each of our instances go here,
    // we've provided one for you to get started

    // The image/sprite for our enemies, this uses
    // a helper we've provided to easily load images
    this.dir = dir;
    this.speed = speed * dir;
    this.row = row;
    if (dir > 0) {
        this.x = - block.width;
        // this.sprite = 'images/enemy-bug.png';
        this.sprite = 'images/enemy-bug.png';
    } else {
        this.x = block.width * 6;
        // this.sprite = 'images/enemy-bug-flipped.png';
        this.sprite = 'images/enemy-bug-flipped.png';
    }
    this.y = block.height * row;
};

// Update the enemy's position, required method for game
// Parameter: dt, a time delta between ticks
Enemy.prototype.update = function (dt) {
    // You should multiply any movement by the dt parameter
    // which will ensure the game runs at the same speed for
    // all computers.
    this.x = this.x + (block.width * this.speed * dt);
};

// Draw the enemy on the screen, required method for game
Enemy.prototype.render = function () {
    var img = Resources.get(this.sprite);
    ctx.drawImage(img, this.x, this.y - (block.height / 2));
};

// Now write your own player class
// This class requires an update(), render() and
// a handleInput() method.
var Player = function (map, rocks) {
    //this.sprite = 'images/char-boy.png';
    this.sprite = 'images/char-boy.png';
    this.x = 2 * block.width;
    this.y = 5 * block.height;
    this.xVel = 0;
    this.yVel = 0;
    this.map = map;
    this.rocks = rocks;
}

Player.prototype.update = function () {
    let x = this.x;
    let y = this.y;

    this.x = clamp(x + (this.xVel * block.width), 0, area.width - block.width);
    this.y = clamp(y + (this.yVel * block.height), 0, area.height - block.height);

    //reset the velocity
    this.xVel = 0;
    this.yVel = 0;

    this.col = Math.floor(this.x / block.width);
    this.row = Math.floor(this.y / block.height);

    const current_grid = this.map.charAt((this.row * area.cols) + this.col);
    const current_rocks = this.rocks.charAt((this.row * area.cols) + this.col)
    if (current_grid === 'w' || current_rocks === 'r') {
        this.x = x;
        this.y = y;
    }
}

Player.prototype.render = function () {
    ctx.drawImage(Resources.get(this.sprite), this.x, this.y - (block.height / 2));
}

Player.prototype.handleInput = function (key) {
    if (key === 'left') {
        this.xVel = -1;
    } else if (key === 'right') {
        this.xVel = 1;
    } else if (key === 'up') {
        this.yVel = -1;
    } else if (key === 'down') {
        this.yVel = 1;
    }
}

Player.prototype.hit = function (enemy) {
    this.sprite = (this.sprite === 'images/char-boy-box.png') ? 'images/char-boy.png' : 'images/char-boy-box.png';
}

var Stage = function () {
    const toMap = (str) => { return str.replace(/\s+/g, '') }
    this.map = toMap(`wwwgw
                   ggggg
                   sssss
                   ggggg
                   sssss
                   ggggg`);

    this.rocks = toMap(`___x_
                     rrr_r
                     _____
                     _____
                     _____
                     _____`);
    const s_index = this.rocks.indexOf('x');
    this.star = {col: Math.floor(s_index % area.cols), row: Math.floor(s_index / area.cols)};
    console.log(this.star);

}

Stage.prototype.render = function () {
    // Before drawing, clear existing canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tile_image = {
        'g': 'images/grass-block.png',
        's': 'images/stone-block.png',
        'w': 'images/water-block.png'
    };

    const fg_image = {
        'r': 'images/Rock.png',
        'x': 'images/Star.png'
    };


    for (row = 0; row < area.rows; row++) {
        for (col = 0; col < area.cols; col++) {
            const tile = this.map.charAt((row * area.cols) + col);
            ctx.drawImage(Resources.get(tile_image[tile]), col * 101, row * 83);
        }
    }

    for (row = 0; row < area.rows; row++) {
        for (col = 0; col < area.cols; col++) {
            const fg = this.rocks.charAt((row * area.cols) + col);
            if (fg_image[fg]) {
                ctx.drawImage(Resources.get(fg_image[fg]), col * 101, (row * 83) - (block.height / 2));
            }
        }
    }
}



var Scene = function () {
    this.stage = new Stage();
    this.player = new Player(this.stage.map, this.stage.rocks);
    this.allEnemies = [new Enemy(2, 1, 1), new Enemy(0, 1.5, 1), new Enemy(5, 1.2, -1)];

    this.level_time = 0;
    this.next_enemy = 0;

    this.level = 0;
}

Scene.prototype.init = function () {
    // This listens for key presses and sends the keys to your
    // Player.handleInput() method. You don't need to modify this.
    let player = this.player;
    document.addEventListener('keyup', function (e) {
        var allowedKeys = {
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down'
        };

        player.handleInput(allowedKeys[e.keyCode]);
    });
}

Scene.prototype.update = function (dt) {
    var that = this;
    //total time in level
    this.level_time += dt;
    //update the enemies one by one
    this.allEnemies.forEach(function (enemy) {
        enemy.update(dt);
    });

    //update player 
    this.player.update();

    //check for player/enemy collisions
    this.allEnemies.forEach(function (enemy) {
        if ((Math.abs(that.player.x - enemy.x) < block.width) &&
            (Math.abs(that.player.y - enemy.y) < block.height)) {
            that.player.hit(enemy);
        }
    });

    //check for player/star collisions
    if (this.player.col === this.stage.star.col &&
        this.player.row === this.stage.star.row){
        change_scene(new Scene()); //crazy idea?
        return;
    }
    //remove enemies which have left the screen
    this.allEnemies = this.allEnemies.filter((enemy) => ((enemy.x < area.width) && (enemy.x > 0 - block.width - 1)));

    //every 5s add a new enemy
    if (this.level_time > this.next_enemy) {
        this.allEnemies.push(new Enemy(2, 1, 1));
        this.next_enemy = this.level_time + 5;
    }
}

Scene.prototype.render = function () {
    this.stage.render();

    this.allEnemies.forEach(function (enemy) {
        enemy.render();
    });

    this.player.render();
}

Scene.prototype.reset = function () {
    //no-op
    this.level_time = 0;
}

let scene = new Scene();

let menu = (function () {
    let obj = {};

    let time = 0;

    obj.update = function (dt) {
        //update here
        time += dt;
        if (time > 5) {
            change_scene(scene);
        }
    };

    obj.render = function () {
        //render here
        ctx.font = "48px serif";
        ctx.fillText("Hello world", 50, 100);
    }

    return obj;
}());