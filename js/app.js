const area = { width: 5 * 101, height: 6 * 83, rows: 6, cols: 5 }
const block = { width: 101, height: 83 };
const canvas = { width: 505, height: 606 };
// const grid = { x: 0, y: 0, width: 505, height: 606 }

var Grid = function(cellWidth, cellHeight){
    this.width = cellWidth;
    this.height = cellHeight;
}

Grid.prototype.toWorld = function (i,j){
    return {x: i * this.width, y: j * this.height};
}

Grid.prototype.toGrid = function(x,y){
    return {i: Math.floor(x/this.width),
            j: Math.floor(y/this.height)};
}

const grid = new Grid(101,83);
const unit = grid.toWorld(1,1);
const screen = {min: grid.toWorld(0,0), max: grid.toWorld(5,6)};
const bounds = {min: grid.toWorld(-1,-1), max: grid.toWorld(5+1,6+1)};

var within = function(v,box) {
    const size = grid.toWorld(1,1);
    let vmax = {x: v.x + size.x, y: v.y + size.y};
    return v.x >= box.min.x && v.y >= box.min.y && vmax.x <= box.max.x && vmax.y <= box.max.y;
}

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
        let offset = this.offset ? grid.toWorld(0,0.5).y : 0; //center of image
        ctx.drawImage(img, this.x, this.y - offset);
    }
}

// Enemies our player must avoid
var Enemy = function () {
    const obj = new Tile();
    obj.type = 'enemy';

    obj.update = dt => obj.x = obj.x + (obj.width * obj.speed * dt);

    return obj;
};

var EnemySystem = function (enemy_spawns) {
    const obj = {};
    obj.time = 0;
    obj.enemy_spawns = enemy_spawns;
    obj.enemy_spawns.forEach(spawn => spawn.next_enemy_time = 0);
    obj.enemies = [];
    obj.enemy_spawns.forEach(function (spawn) {
        spawn.interval = 101 / (Math.abs(spawn.speed) * 101);
        spawn.index = 0;
    });


    obj.update = function (dt) {
        obj.time += dt;
        obj.enemies.forEach(enemy => enemy.update(dt));
        //remove enemies which have left the screen
        obj.enemies = obj.enemies.filter((enemy) => ((enemy.x <= 505 + enemy.width) && (enemy.x >= 0 - enemy.width)));

        obj.enemy_spawns.forEach(function (spawn) {
            if (obj.time > spawn.next_enemy_time) {
                obj.create_enemy(spawn);
                spawn.next_enemy_time = obj.time + (spawn.pattern[spawn.index] + 1) * spawn.interval;
                spawn.index = (spawn.index + 1) % spawn.pattern.length;
            }
        });

        obj.create_enemy = function (spawn) {
            let enemy = Enemy();
            enemy.speed = spawn.speed;
            enemy.setCol((spawn.speed > 0) ? -1 : 5 + 1);
            enemy.setRow(spawn.row);
            enemy.sprite = (spawn.speed > 0) ? 'images/enemy-bug.png' : 'images/enemy-bug-flipped.png';
            obj.enemies.push(enemy);
        }
    }

    obj.render = function () {
        obj.enemies.forEach(enemy => enemy.render());
    }
    return obj;
}

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
        obj.xVel = {'left' : -1, 'right' : 1}[key] || 0;
        obj.yVel = {'up' : -1, 'down' : 1}[key] || 0;
    };

    return obj;
}

var bulidLayer = function (map_string) {
    //take a string describing the map layer and return an array of tiles
    //representing the map

    //this could be passed into the function too
    const letter_tile = {
        'r': { type: 'rock', sprite: 'images/Rock.png', offset: true},
        'x': { type: 'star', sprite: 'images/Star.png', offset: true},
        'g': { type: 'grass', sprite: 'images/grass-block.png', offset: false},
        's': { type: 'stone', sprite: 'images/stone-block.png', offset: false},
        'p': { type: 'player_start', sprite: '', offset: false},
        'w': { type: 'water', sprite: 'images/water-block.png', offset: false}
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

var Scene = function () {
    this.player = null;

    this.fg = [];
    this.bg = [];
    this.level = 0;

}

Scene.prototype.init = function () {
    let player = this.player = new Player();

    document.addEventListener('keyup', function (e) {
        var allowedKeys = {
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down'
        };

        player.handleInput(allowedKeys[e.keyCode]);
    });


    this.load_level(level_data[this.level]);
}

Scene.prototype.load_level = function (level_data) {
    //build level
    this.fg = bulidLayer(level_data.fg);
    this.bg = bulidLayer(level_data.bg);
    this.level_time = 0;

    //build enemies
    this.enemy_system = EnemySystem(level_data.enemies);
    //very sneaky idea but doesnt work
    for (i = 0; i < 2; i += 0.1) {
        this.enemy_system.update(i);
    }

    //build player
    let player = this.player;
    let player_start = this.fg.find(tile => tile.type === 'player_start');
    player.x = player_start.x;
    player.y = player_start.y;

}

Scene.prototype.update = function (dt) {
    let player = this.player;

    const move_player_back = (function (oldx, oldy) {
        return function () { player.x = oldx, player.y = oldy };
    }(player.x, player.y));

    const contains = (row, col, type, list) => {
        return list.find(tile => (tile.row() === row && tile.col() === col && tile.type === type))
    };

    //total time in level
    this.level_time += dt;

    this.enemy_system.update(dt);
    player.update(dt);

    const player_row = player.row();
    const player_col = player.col();

    const player_touch_fg = type => contains(player_row, player_col, type, this.fg);
    const player_touch_bg = type => contains(player_row, player_col, type, this.bg);
    const player_touch_enemy = type => contains(player_row, player_col, type, this.enemy_system.enemies);

    // reset the player if moved in ilegal way
    const oorange = tile => (tile.x + tile.width > area.width || tile.x < 0) || (tile.y + tile.height > area.height || tile.y < 0);
    
    // if (player_touch_bg('water') || oorange(player) || player_touch_fg('rock')) {
    //     move_player_back();
    // }
    if (!within(player,screen)) {
        move_player_back();
    }

    // check for player/enemy collisions
    if (player_touch_enemy('enemy')) {
        // player.hit('blah!');
        let player_start = this.fg.find(tile => tile.type === 'player_start');
        player.x = player_start.x;
        player.y = player_start.y;
    }

    // check for player/star collisions
    if (player_touch_fg('star')) {
        if (level_data.length - 1 === this.level) {
            //weve won
            change_scene(menu);
        } else {
            this.level += 1;
            change_scene(scene); //crazy idea?
        }
    }
}

Scene.prototype.render = function () {
    // this.stage.render();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.bg.forEach(tile => tile.render());
    this.fg.forEach(tile => tile.render());
    this.enemy_system.render();
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

    obj.init = function () {
        //do nothing
    }

    obj.update = function (dt) {
        //update here
        time += dt;
        if (time > 5) {
            scene.level = 0;
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




