const area = { width: 5 * 101, height: 6 * 83, rows: 6, cols: 5 }
const block = { width: 101, height: 83 };
const canvas = { width: 505, height: 606 };

function vec(x, y) { return { x: x, y: y } };

var Grid = function (cellWidth, cellHeight) {
    this.width = cellWidth;
    this.height = cellHeight;
}

Grid.prototype.toScreen = function (v) {
    return vec(v.x * this.width, v.y * this.height)
};

Grid.prototype.toGrid = function (v) {
    return vec(v.x / this.width, v.y / this.height);
}
Grid.prototype.toGridSnap = function (v) {
    return vec(Math.floor(v.x / this.width), Math.floor(v.y / this.height));
}

const grid = new Grid(101, 83);
const unit = grid.toScreen(vec(1, 1));

const screen = {
    min: vec(0, 0),
    max: vec(5, 6)
};

const bounds = {
    min: vec(0 - 2, -1),
    max: vec(5 + 2, 6 + 1)
};

var point_inside = function (p, b) {
    //is point p within box b?
    return p.x >= b.min.x && p.x < b.max.x && p.y >= b.min.y && p.y < b.max.y;
}

var Tile = function () {
    this.loc = vec(0, 0);
    this.sprite = '';
};

Tile.prototype.render = function () {
    //we use an offset of half height to render characters
    //bg use an offset of 0
    //bit hacky
    if (this.sprite) {
        var img = Resources.get(this.sprite);
        let screen_pos = this.toScreen();

        ctx.drawImage(img, screen_pos.x, screen_pos.y);
    }

}

Tile.prototype.toScreen = function () {
    return grid.toScreen(vec(this.loc.x, this.loc.y - 0.5));
}

// Enemies our player must avoid
var Enemy = function () {
    const obj = new Tile();
    obj.type = 'enemy';
    //obj.worldVec = function () { return this.loc };

    obj.update = dt => obj.loc.x = obj.loc.x + 1 * obj.speed * dt;

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
        // obj.enemies = obj.enemies.filter(enemy => enemy.loc.x >= screen.min.x -1 && enemy.loc.x <= screen.max.x);
        obj.enemies = obj.enemies.filter(enemy => point_inside(enemy.loc, bounds));

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
            enemy.loc.x = (spawn.speed > 0) ? screen.min.x - 1 : screen.max.x;
            enemy.loc.y = spawn.row;
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
    obj.vel = vec(0, 0);

    obj.update = function (dt) {
        obj.loc.x = obj.loc.x + (obj.vel.x * 1);
        obj.loc.y = obj.loc.y + (obj.vel.y * 1)

        //reset the velocity
        obj.vel = vec(0, 0);
    };

    obj.handleInput = function (key) {
        vels = {
            'left': vec(-1, 0),
            'right': vec(1, 0),
            'up': vec(0, -1),
            'down': vec(0, 1)
        };
        obj.vel = vels[key] || vec(0, 0);
    };

    return obj;
}

var bulidLayer = function (map_string) {
    //take a string describing the map layer and return an array of tiles
    //representing the map

    //this could be passed into the function too
    const letter_tile = {
        'r': { type: 'rock', sprite: 'images/Rock.png', offset: true },
        'x': { type: 'star', sprite: 'images/Star.png', offset: true },
        'g': { type: 'grass', sprite: 'images/grass-block.png', offset: false },
        's': { type: 'stone', sprite: 'images/stone-block.png', offset: false },
        'p': { type: 'player_start', sprite: '', offset: false },
        'w': { type: 'water', sprite: 'images/water-block.png', offset: false }
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
            tile.loc.x = i % area.cols;
            tile.loc.y = Math.floor(i / area.cols);
            tile.type = tile_spec.type;
            if(!tile_spec.offset){ 
                tile.toScreen = () => grid.toScreen(tile.loc);
            } else {
                tile.toScreen = () => grid.toScreen(vec(tile.loc.x, tile.loc.y - 0.5));
            };

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
    player.loc.x = player_start.loc.x;
    player.loc.y = player_start.loc.y;
}

Scene.prototype.update = function (dt) {
    let player = this.player;

    const move_player_back = (function (x, y) {
        return function () { player.loc.x = x, player.loc.y = y };
    }(player.loc.x, player.loc.y));

    const same_square = function (a, b) {
        let result = a.x === b.x && a.y === b.y;
        return result;
    }

    const contains = (location, type, list) => {
        return list.find(tile => (same_square(tile.loc, location) && tile.type === type))
    };

    //total time in level
    this.level_time += dt;

    this.enemy_system.update(dt);
    player.update(dt);

    const player_touch_fg = type => contains(player.loc, type, this.fg);
    const player_touch_bg = type => contains(player.loc, type, this.bg);

    // // reset the player if moved in ilegal way
    // //const oorange = tile => (tile.x + tile.width > area.width || tile.x < 0) || (tile.y + tile.height > area.height || tile.y < 0);

    if (player_touch_bg('water') || player_touch_fg('rock')) {
        move_player_back();
    }

    if (!point_inside(player.loc, screen)) {
        move_player_back();
        console.log('exit!');
    }
    that = this;

    // check for player/enemy collisions
    this.enemy_system.enemies.forEach(function (enemy) {
        let same_line = player.loc.y === enemy.loc.y;
        let x_distance = Math.abs(player.loc.x - enemy.loc.x);
        if (same_line && x_distance < 0.5) {
            let player_start = that.fg.find(tile => tile.type === 'player_start');
            player.loc.x = player_start.loc.x;
            player.loc.y = player_start.loc.y;
        }
    });


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




