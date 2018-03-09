//some constants
const COLS = 5;
const ROWS = 6;
const WIDTH = 101;
const HEIGHT = 83;

//Two easing functions for tweening 
let SMOOTHSTEP = t => t * t * (3 - 2 * t);

//A 2D vector
const Vec = function (x, y) {
    this.x = x;
    this.y = y;
}

Vec.prototype.add = function (a) {
    return new Vec(this.x + a.x, this.y + a.y);
}

Vec.prototype.equals = function (a) {
    return this.x === a.x && this.y === a.y;
}

//A drawable sprite with a position and image
const Sprite = function (pos, image) {
    this.pos = pos;
    this.image = image || '';
}

Sprite.prototype.draw = function () {
    const image = Resources.get(this.image);
    ctx.drawImage(image, this.pos.x * WIDTH, this.pos.y * HEIGHT - (HEIGHT / 2));
}

//an Enemy vehicle
const Enemy = function (pos, speed) {
    this.speed = speed;
    const image = speed > 0 ? 'images/enemy-bug.png' : 'images/enemy-bug-flipped.png';
    this.sprite = new Sprite(pos, image);
}

//move the enemy along the screen
Enemy.prototype.update = function (dt) {
    this.sprite.pos.x = this.sprite.pos.x + this.speed * dt;
}

Enemy.prototype.draw = function () {
    this.sprite.draw();
}

//The player
const Player = function (pos) {
    this.sprite = new Sprite(pos, 'images/char-boy.png');
    this.velocity = new Vec(0, 0);
}

Player.prototype.draw = function () {
    this.sprite.draw();
}

Player.prototype.handleInput = function (key) {
    let velocities = {
        'left': new Vec(-1, 0),
        'right': new Vec(1, 0),
        'up': new Vec(0, -1),
        'down': new Vec(0, 1)
    };
    this.velocity = velocities[key] || new Vec(0, 0);
};

Player.prototype.update = function (dt) {
    this.sprite.pos.x = this.sprite.pos.x + this.velocity.x;
    this.sprite.pos.y = this.sprite.pos.y + this.velocity.y;
    this.velocity = new Vec(0, 0);
};

const EnemyEmitter = function (row, speed, pattern) {
    this.x = (speed > 0) ? -1 : COLS;
    this.y = row;
    this.speed = speed;
    //time it takes to move one square - time = dist / speed
    let stdInterval = 1 / Math.abs(speed);
    this.intervals = pattern.map(n => (n * stdInterval) + stdInterval);
    this.pattern = pattern;
}

//contains tiles for background of level and info about how enemies appear
const Level = function (spec) {
    const bgSprites = {
        'g': { type: 'grass', image: 'images/grass-block.png', offset: false },
        's': { type: 'stone', image: 'images/stone-block.png', offset: false },
        'w': { type: 'water', image: 'images/water-block.png', offset: false }
    };

    const fgSprites = {
        'r': { type: 'rock', image: 'images/Rock.png', offset: true },
        'x': { type: 'star', image: 'images/Star.png', offset: true },
        'p': { type: 'player_start', image: '', offset: false }
    };

    this.bg = [];
    this.fg = [];

    //strip spaces from description of level
    const bgString = spec.bg.replace(/\s+/g, '');
    const fgString = spec.fg.replace(/\s+/g, '');

    for (i = 0; i < bgString.length; i++) {
        const x = i % COLS;
        const y = Math.floor(i / COLS);

        const b = bgSprites[bgString[i]];
        if (b) {
            this.bg.push(new Sprite(new Vec(x, y), b.image));
        }

        const f = fgSprites[fgString[i]];
        if (f) {
            this.fg.push(new Sprite(new Vec(x, y), f.image));
        }
    }
    //create enemy emitters
    this.emitters = [];
    spec.enemies.forEach(enemyEmitter => {
        this.emitters.push(new EnemyEmitter(enemyEmitter.row, enemyEmitter.speed, enemyEmitter.pattern));
    });
};

//return true if player can not step on pos
Level.prototype.solid = function (pos) {
    if (pos.x < 0 || pos.y < 0) {
        return true;
    }
    if (pos.x >= COLS || pos.y >= ROWS) {
        return true;
    }
    if (this.bg.find(sprite => sprite.image === 'images/water-block.png' && sprite.pos.equals(pos))) {
        return true;
    }
    if (this.fg.find(sprite => sprite.image === 'images/Rock.png' && sprite.pos.equals(pos))) {
        return true;
    }

    return false;
}

//Manages timed events and tweens
const Animation = function () {
    //this will hold all our tween objects
    this.all_tweens = [];
};

Animation.prototype.add = function (tween) {
    tween.rate = 1 / tween.duration;
    tween.progress = 0;
    this.all_tweens.push(tween);
}

Animation.prototype.update = function (dt) {
    //we are going to iterate backwards as we may remove an item from the array
    for (i = this.all_tweens.length - 1; i >= 0; i--) {
        let tween = this.all_tweens[i];
        //calculate the tweens progress
        tween.progress = tween.progress + tween.rate * dt;
        //clamp to 1
        tween.progress = tween.progress > 1 ? 1 : tween.progress;
        //if tween has a func call it with the current progress, a val between 0
        //and 1
        if (tween.func) { tween.func(tween.progress) };
        //if the tween is finished
        if (tween.progress >= 1) {
            //call the after function
            if (tween.onFinish) { tween.onFinish() };
            //remove it from our array
            this.all_tweens.splice(i, 1);
        };
    }
}

//represents 'tweening' between two values
const Tween = function (obj, keys, time, ease) {
    this.values = {};
    this.ease = ease || (id => id);
    this.duration = time;

    //first copy all the starting values
    Object.keys(keys).forEach(k =>
        this.values[k] = { start: obj[k], diff: keys[k] - obj[k] });

    //build and set the tweening function
    this.func = function (p) {
        Object.keys(keys).forEach(k => {
            obj[k] = this.values[k].start + this.ease(p) * this.values[k].diff;
        })
    }
};

//pass in a thunk to be run when the timer is up
Tween.prototype.after = function (f) {
    this.onFinish = f;
}

//performs an action after a duration
const Timer = function (time, f) {
    this.duration = time;
    this.onFinish = f;
};


//the menu scene
const Menu = function (message, onKeyPress) {
    this.message = message;
    this.onKeyPress = onKeyPress;
    this.listeningForKey = false;
}

Menu.prototype.setKeyListener = function () {
    const that = this;
    if (!this.listeningForKey) {
        const startGame = function (event) {
            that.listeningForKey = false;
            that.onKeyPress();
        }
        document.addEventListener('keydown', startGame, { once: true });
        this.listeningForKey = true;;
    }
}

Menu.prototype.init = function () {
    this.animation = new Animation();
    ctx.font = "48px sans-serif";
    const textMetric = ctx.measureText(this.message);
    const textX = (ctx.canvas.width / 2) - (textMetric.width / 2);
    const textY = (ctx.canvas.height / 2);
    this.pos = { y: 10, x: textX};
    this.animation.add(new Tween(this.pos, { y: textY}, 1, SMOOTHSTEP));
}

Menu.prototype.update = function (dt) {
    this.animation.update(dt);
    this.setKeyListener();
}

Menu.prototype.render = function () {
    ctx.save();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = '#5fc148';
    ctx.fillRect(0,0,606,505,);
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'bottom';
    ctx.fillText(this.message, this.pos.x, this.pos.y);
    ctx.restore();
}

Menu.prototype.reset = function () {

}

//the actual game - contains player, enemies, bg tiles etc.
const Scene = function () {
    this.currentLevel = 1;
    this.lives = 3;
};

Scene.prototype.init = function () {
    const that = this;
    this.animation = new Animation();
    this.enemies = [];
    this.level = new Level(level_data[this.currentLevel]);
    this.playerStart = this.level.fg.find(sprite => sprite.image === '').pos;
    this.player = new Player(new Vec(this.playerStart.x, this.playerStart.y));

    document.addEventListener('keyup', function (e) {
        var allowedKeys = {
            37: 'left',
            38: 'up',
            39: 'right',
            40: 'down'
        };

        that.player.handleInput(allowedKeys[e.keyCode]);
    });

    this.level.emitters.forEach(emitter => {
        const addEnemy = (i) => {
            this.enemies.push(new Enemy(new Vec(emitter.x, emitter.y), emitter.speed));
            this.animation.add(new Timer(emitter.intervals[i], () => addEnemy((i + 1) % emitter.intervals.length)));
        }
        addEnemy(0);
    });

    //fast forward time 5 seconds - this gives the world a head start on the player
    for(j = 0; j < 60 * 5; j++) {
        this.update(1/60);
    }

};

Scene.prototype.update = function (dt) {
    const oldPlayerX = this.player.sprite.pos.x;
    const oldPlayerY = this.player.sprite.pos.y;

    this.player.update();

    if (this.level.solid(this.player.sprite.pos)) {
        this.player.sprite.pos.x = oldPlayerX;
        this.player.sprite.pos.y = oldPlayerY;
    }

    if (this.player.sprite.pos.equals(this.level.fg.find(sprite => sprite.image === 'images/Star.png').pos)) {
        if (this.currentLevel === level_data.length - 1) {
            this.animation.add(new Timer(0.2, () => change_scene(win)));
        } else {
            this.currentLevel = this.currentLevel + 1;
            this.init();
        }
    }

    //update enemies and remove any off screen
    this.enemies.forEach(enemy => enemy.update(dt));
    this.enemies = this.enemies.filter(e => e.sprite.pos.x <= COLS && e.sprite.pos.x >= -1);

    //check for player / enemy collision
    this.enemies.forEach(enemy => {
        let same_line = this.player.sprite.pos.y === enemy.sprite.pos.y;
        let x_distance = Math.abs(this.player.sprite.pos.x - enemy.sprite.pos.x);
        if (same_line && x_distance < 0.65) {
            tween = new Tween(this.player.sprite.pos, { x: this.playerStart.x, y: this.playerStart.y }, 1.5, SMOOTHSTEP);
            this.animation.add(tween);
            this.lives = this.lives - 1;
        }
    });

    if (this.lives < 1) {
        this.reset();
        change_scene(gameover);
    }
    this.animation.update(dt);
}

Scene.prototype.render = function () {
    ctx.clearRect(0, 0, COLS * WIDTH, ROWS * HEIGHT);
    this.level.bg.forEach(function (sprite) {
        var image = Resources.get(sprite.image);
        ctx.drawImage(image, sprite.pos.x * WIDTH, sprite.pos.y * HEIGHT);
    });

    this.level.fg.forEach(function (sprite) {
        if (sprite.image) {
            var image = Resources.get(sprite.image);
            ctx.drawImage(image, sprite.pos.x * WIDTH, sprite.pos.y * HEIGHT - (HEIGHT / 2));
        }
    });
    this.player.draw();
    this.enemies.forEach(enemy => enemy.draw());

    //draw 'HUD'
    for (i = 0; i < this.lives; i++) {
        const heartImage = Resources.get('images/Heart.png');
        //these values are magic - from the image dimensons and trial and error!
        ctx.drawImage(heartImage, i * WIDTH / 2, 30, WIDTH / 2, 171 / 2);
    }
}

Scene.prototype.reset = function () {
    this.lives = 3;
    this.currentLevel = 0;
}

const game = new Scene();
const menu = new Menu("Press a key to start!", () => { game.reset(); change_scene(game) });
const gameover = new Menu("Gameover!", () => change_scene(menu))
const win = new Menu("You Win!", () => change_scene(menu));

let scene = game;