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

const grid = new Grid(101, 83);

const screen = {
    min: vec(0, 0),
    max: vec(5, 6)
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
var Enemy = function (loc, speed) {
    const obj = new Tile();
    obj.type = 'enemy';
    obj.loc.x = loc.x;
    obj.loc.y = loc.y;
    obj.speed = speed;
    obj.sprite = (obj.speed > 0) ? 'images/enemy-bug.png' : 'images/enemy-bug-flipped.png';
    obj.update = dt => obj.loc.x = obj.loc.x + 1 * obj.speed * dt;

    return obj;
};

var EnemyEmitter = function (spec) {
    var emitter = {};
    let x = (spec.speed > 0) ? screen.min.x - 1 : screen.max.x;
    let y = spec.row;
    emitter.loc = vec(x, y);
    emitter.speed = spec.speed;
    emitter.interval = 1 / Math.abs(spec.speed);
    emitter.index = 0;
    emitter.pattern = spec.pattern;
    let time = 0;
    emitter.update = function (dt, func) {
        time += dt;
        if (time > (emitter.pattern[emitter.index] + 1) * emitter.interval) {
            func(emitter);
            time = 0;
            emitter.index = (emitter.index + 1) % emitter.pattern.length;
        }
    }

    return emitter;
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
    const cols = screen.max.x;

    for (i = 0; i < map_string.length; i++) {
        let tile_spec = letter_tile[map_string[i]];
        if (tile_spec) {
            let tile = new Tile();
            tile.sprite = tile_spec.sprite;
            tile.loc.x = i % cols;
            tile.loc.y = Math.floor(i / cols);
            tile.type = tile_spec.type;
            if (!tile_spec.offset) {
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
    this.enemies = [];
    this.emitters = null;
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
    this.emitters = level_data.enemies.map(EnemyEmitter);
    this.level_time = 0;

    //build enemies
    //this.enemy_system = EnemySystem(level_data.enemies);
    //very sneaky idea but doesnt work
    for (i = 0; i < 2; i += 0.1) {
        this.update(i);
    }

    //build player
    let player = this.player;
    let player_start = this.fg.find(tile => tile.type === 'player_start');
    player.loc.x = player_start.loc.x;
    player.loc.y = player_start.loc.y;
}

Scene.prototype.update = function (dt) {
    that = this;
    let player = this.player;

    const move_player_back = (function (x, y) {
        return function () { player.loc.x = x, player.loc.y = y };
    }(player.loc.x, player.loc.y));

    const contains = (loc, type, list) => {
        return list.find(tile =>
            (tile.loc.x === loc.x && tile.loc.y === loc.y) && tile.type === type)
    };

    //total time in level
    this.level_time += dt;

    // this.enemy_system.update(dt);
    this.enemies.forEach(enemy => enemy.update(dt));

    //remove enemies which have left the screen
    this.enemies = this.enemies.filter(enemy => enemy.loc.x >= screen.min.x - 1 && enemy.loc.x <= screen.max.x);

    this.emitters.forEach(function (emitter) {
        emitter.update(dt, emitter =>
            that.enemies.push(Enemy(emitter.loc, emitter.speed)));
    });

    player.update(dt);

    if (contains(player.loc, 'water', this.bg) || contains(player.loc, 'rock', this.fg)) {
        move_player_back();
    }

    // check for player/star collisions
    if (contains(player.loc, 'star', this.fg)) {
        if (level_data.length - 1 === this.level) {
            //weve won
            change_scene(menu);
        } else {
            this.level += 1;
            change_scene(scene); //crazy idea?
        }
    }

    if (!point_inside(player.loc, screen)) {
        move_player_back();
    }

    // check for player/enemy collisions
    this.enemies.forEach(function (enemy) {
        let same_line = player.loc.y === enemy.loc.y;
        let x_distance = Math.abs(player.loc.x - enemy.loc.x);
        if (same_line && x_distance < 0.5) {
            let player_start = that.fg.find(tile => tile.type === 'player_start');
            player.loc.x = player_start.loc.x;
            player.loc.y = player_start.loc.y;
        }
    });
}

Scene.prototype.render = function () {
    // this.stage.render();
    const min = grid.toScreen(screen.min);
    const max = grid.toScreen(screen.max);

    ctx.clearRect(min.x, min.y, max.x, max.y);
    this.bg.forEach(tile => tile.render());
    this.fg.forEach(tile => tile.render());
    this.enemies.forEach(enemy => enemy.render());
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




