const area = { width: 5 * 101, height: 6 * 83, rows: 6, cols: 5 }
const block = { width: 101, height: 83 };
const canvas = { width: 505, height: 606 };
const grid = { x: 0, y: 0, width: 505, height: 606 }


var Tile = function () {
    this.x = 0;
    this.y = 0;
    this.width = 101;
    this.height = 83;
    this.sprite = '';
    this.offset = true;
};

Tile.prototype.col = function () {
    return Math.floor((this.x + (this.width / 2)) / this.width);
}

Tile.prototype.row = function () {
    return Math.floor((this.y + (this.height / 2)) / this.height);
}

Tile.prototype.setRow = function (row) {
    this.y = row * this.height;
}

Tile.prototype.setCol = function (col) {
    this.x = col * this.width;
}

Tile.prototype.render = function () {
    //we use an offset of half height to render characters
    //bg use an offset of 0
    //bit hacky
    if (this.sprite) {
        var img = Resources.get(this.sprite);
        let offset = this.offset ? this.height / 2 : 0;
        ctx.drawImage(img, this.x, this.y - offset);
    }
}

// Enemies our player must avoid
var Enemy = function (row, speed, dir) {
    this.dir = dir;
    this.speed = speed * dir;
    this.row = row;
    this.tile = new Tile();
    if (dir > 0) {
        this.tile.setCol(-1);
        this.tile.sprite = 'images/enemy-bug.png';
    } else {
        this.tile.setCol(5 + 1);
        this.tile.sprite = 'images/enemy-bug-flipped.png';
    }
    this.tile.setRow(row);
};

// Update the enemy's position, required method for game
// Parameter: dt, a time delta between ticks
Enemy.prototype.update = function (dt) {
    // You should multiply any movement by the dt parameter
    // which will ensure the game runs at the same speed for
    // all computers.
    this.tile.x = this.tile.x + (this.tile.width * this.speed * dt);
};

// Draw the enemy on the screen, required method for game
Enemy.prototype.render = function () {
    this.tile.render();
};

// Now write your own player class
// This class requires an update(), render() and
// a handleInput() method.
var Player = function () {
    this.tile = new Tile();
    this.tile.sprite = 'images/char-boy.png';
    this.xVel = 0;
    this.yVel = 0;
}

Player.prototype.update = function () {
    this.tile.x = this.tile.x + (this.xVel * block.width);
    this.tile.y = this.tile.y + (this.yVel * block.height)

    //reset the velocity
    this.xVel = 0;
    this.yVel = 0;
}

Player.prototype.render = function () {
    this.tile.render();
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
    console.log('collide');
}

var Stage = function () {
    this.fg = this.bulidLayer(`___x_
                             r_r_r
                             _____
                             __r__
                             _____
                             p____`);
    this.bg = this.bulidLayer(`wwwgw
                   ggggg
                   sssss
                   ggggg
                   sssss
                   ggggg`);

    this.star = this.fg.find(tile => tile.type === 'star');
    this.player_start = this.fg.find(tile => tile.type === 'player_start');
};

Stage.prototype.bulidLayer = function (map_string) {
    //take a string describing the map layer and return an array of tiles
    //representing the map

    //this could be passed into the function too
    const letter_tile = {
        'r': { type: 'rock', sprite: 'images/Rock.png', layer: 1, offset: true },
        'x': { type: 'star', sprite: 'images/Star.png', layer: 1, offset: true },
        'g': { type: 'grass', sprite: 'images/grass-block.png', layer: 0, offset: false },
        's': { type: 'stone', sprite: 'images/stone-block.png', layer: 0, offset: false },
        'p': { type: 'player_start', sprite: '', layer: 0, offset: false },
        'w': { type: 'water', sprite: 'images/water-block.png', layer: 0, offset: false }
    };
    //strip any whitespace
    map_string = map_string.replace(/\s+/g, '');

    //here would be a good place for a sanity check of the string
    //and error checking

    let tiles = [];

    for (i = 0; i < map_string.length; i++) {
        let tile_spec = letter_tile[map_string[i]];
        if (tile_spec) {
            let tile = new Tile();
            tile.sprite = tile_spec.sprite;
            tile.setCol(i % area.cols);
            tile.setRow(Math.floor(i / area.cols));
            tile.offset = tile_spec.offset;
            tile.type = tile_spec.type;

            tiles.push(tile);
        }
    }
    return tiles;
}

Stage.prototype.tilesAt = function (row, col) {
    return this.fg.find(tile => tile.row() === row && tile.col() === col);
}

Stage.prototype.containsTileAt = function (row, col, type) {
    let bg_tile = this.bg.find(tile => tile.row() === row && tile.col() === col);
    let fg_tile = this.tilesAt(row, col);//this.fg.find(tile => tile.row() === row && tile.col() === col);

    return (bg_tile && bg_tile.type === type) || (fg_tile && fg_tile.type === type);
}

Stage.prototype.render = function () {
    // Before drawing, clear existing canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.bg.forEach(tile => tile.render());
    this.fg.forEach(tile => tile.render());
}

var Scene = function () {
    this.stage = new Stage();
    this.player = new Player();
    this.allEnemies = [new Enemy(2, 1, 1), new Enemy(0, 1.5, 1), new Enemy(5, 1.2, -1)];

    this.level_time = 0;
    this.next_enemy = 0;

    this.level = 0;
}

Scene.prototype.init = function () {
    // This listens for key presses and sends the keys to your
    // Player.handleInput() method. You don't need to modify this.
    let player = this.player;
    player.tile.x = this.stage.player_start.x;
    player.tile.y = this.stage.player_start.y;
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
    let player = this.player;
    let player_tile = this.player.tile;
    const move_player_back = (function (oldx, oldy) {
        return function() {player_tile.x = oldx, player_tile.y = oldy};
    }(player_tile.x, player_tile.y));


    //total time in level
    this.level_time += dt;
    //update the enemies one by one
    this.allEnemies.forEach(function (enemy) {
        enemy.update(dt);
    });

    player.update();

    const player_row = player_tile.row();
    const player_col = player_tile.col();

    const player_hit  = type => (this.stage.containsTileAt(player_row, player_col, type));

    //reset the player if moved in ilegal way
    const oorange = tile => (tile.x + tile.width > area.width || tile.x < 0) || (tile.y + tile.height > area.height || tile.y < 0);
    if (player_hit('water') || oorange(player_tile) || player_hit('rock')) {
        move_player_back();
    }

    //check for player/enemy collisions
    this.allEnemies.forEach(function (enemy) {
        if (player_col === enemy.tile.col() &&
            player_row === enemy.tile.row()) {
            player.hit(enemy);
        }
    });

    // check for player/star collisions
    if (player_hit('star')){
        change_scene(new Scene()); //crazy idea?
        return;
    }
    // // check for player/star collisions
    // if (player_col === this.stage.star.col() &&
    //     player_row === this.stage.star.row()) {
    //     change_scene(new Scene()); //crazy idea?
    //     return;
    // }
    //remove enemies which have left the screen
    this.allEnemies = this.allEnemies.filter((enemy) => ((enemy.tile.x <= grid.width + enemy.tile.width) && (enemy.tile.x >= 0 - enemy.tile.width)));

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