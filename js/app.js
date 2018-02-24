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
    const obj = new Tile();
    obj.type = 'enemy';
    obj.dir = dir;
    obj.speed = speed * dir;
    if (dir > 0) {
        obj.setCol(-1);
        obj.sprite = 'images/enemy-bug.png';
    } else {
        obj.setCol(5 + 1);
        obj.sprite = 'images/enemy-bug-flipped.png';
    }
    obj.setRow(row);

    obj.update = dt => obj.x = obj.x + (obj.width * obj.speed * dt);

    return obj;
};

Player = function () {
    const obj = new Tile();

    obj.type = 'player';
    obj.sprite = 'images/char-boy.png';
    obj.xVel = 0;
    obj.yVel = 0;

    obj.update = function (dt) {
        obj.x = obj.x + (obj.xVel * block.width);
        obj.y = obj.y + (obj.yVel * block.height)

        //reset the velocity
        obj.xVel = 0;
        obj.yVel = 0;
    };

    obj.handleInput = function (key) {
        if (key === 'left') {
            obj.xVel = -1;
        } else if (key === 'right') {
            obj.xVel = 1;
        } else if (key === 'up') {
            obj.yVel = -1;
        } else if (key === 'down') {
            obj.yVel = 1;
        }
    };

    obj.hit = function (what) {
        console.log('hit : ' + what);
    };

    return obj;
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
    this.player = Player();
    this.allEnemies = [Enemy(2, 1, 1), Enemy(0, 1.5, 1), Enemy(5, 1.2, -1)];
    stage = this.stage;
    this.entities = Array.prototype.concat(stage.bg, stage.fg, this.allEnemies, [this.player]);
    console.log(this.entities);

    this.level_time = 0;
    this.next_enemy = 0;

    this.level = 0;
}

Scene.prototype.init = function () {
    // This listens for key presses and sends the keys to your
    // Player.handleInput() method. You don't need to modify this.
    let player = this.player;
    player.x = this.stage.player_start.x;
    player.y = this.stage.player_start.y;
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
    
    const move_player_back = (function (oldx, oldy) {
        return function () { player.x = oldx, player.y = oldy };
    }(player.x, player.y));

    const contains = (row, col, type) => {
        debugger;
        return this.entities.find(tile => {
                if(typeof(tile.row) !== 'function'){debugger;}
                thisrow = tile.row();
                thiscol = tile.col();
                return (tile.row() === row && tile.col() === col && tile.type === type);
        });
    };

    //total time in level
    this.level_time += dt;

    //update the enemies one by one
    this.allEnemies.forEach(function (enemy) {
        enemy.update(dt);
    });

    player.update();

    const player_row = player.row();
    const player_col = player.col();

    const player_hit = type => contains(player_row, player_col, type);

    // reset the player if moved in ilegal way
    const oorange = tile => (tile.x + tile.width > area.width || tile.x < 0) || (tile.y + tile.height > area.height || tile.y < 0);
    if (player_hit('water') || oorange(player) || player_hit('rock')) {
        move_player_back();
    }

    // check for player/enemy collisions
    if (player_hit('enemy')) {
        player.hit('blah!');
    }

    // check for player/star collisions
    if (player_hit('star')) {
        change_scene(new Scene()); //crazy idea?
        return;
    }

    //remove enemies which have left the screen
    this.allEnemies = this.allEnemies.filter((enemy) => ((enemy.x <= grid.width + enemy.width) && (enemy.x >= 0 - enemy.width)));

    //every 5s add a new enemy
    if (this.level_time > this.next_enemy) {
        this.allEnemies.push(Enemy(2, 1, 1));
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