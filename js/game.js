(function () {
  'use strict';

  Phaser.Device.whenReady(function () {
    var width = window.screen.width;
    var height = window.screen.height;

    if (Phaser.Device.desktop) {
      width = 400;
      height = 600;
    }

    var game = new Phaser.Game(width, height, Phaser.CANVAS,
      'game', { preload: preload, create: create, update: update });

    function preload() {
      game.load.atlas('breakout', 'img/breakout.png', 'img/breakout.json');
      game.load.image('background', 'img/background.png');
      game.load.audio('brickDeath', ['sfx/brickDeath.mp3']);
      game.load.audio('hitPaddle', ['sfx/hitPaddle.mp3']);
      game.load.audio('powerdown', ['sfx/powerdown.mp3']);
      game.load.audio('powerup', ['sfx/powerup.mp3']);
      game.load.audio('recover', ['sfx/recover.mp3']);
    }

    var ball;
    var paddle;
    var bricks;

    var bricksWithItems = [];
    var sounds = {};
    var items;

    var ballOnPaddle = true;

    var lives = 3;
    var score = 0;

    var scoreText;
    var livesText;
    var introText;
    var levelText;

    var currentLevel = 0;
    var breakoutLevels;

    var gemsTimer;
    var gemTimeout = 10000;

    var s;

    function create() {

      game.physics.startSystem(Phaser.Physics.ARCADE);

      //  We check bounds collisions against all walls other than the bottom one
      game.physics.arcade.checkCollision.down = false;

      s = game.add.tileSprite(0, 0, width, height, 'background');
      items = this.game.add.group();
      items.enableBody = true;
      items.physicsBodyType = Phaser.Physics.ARCADE;

      loadLevels();
      createSoundsAndMusic();
      populateLevel(currentLevel);

      paddle = game.add.sprite(game.world.centerX, height - 50, 'breakout', 'paddle_big.png');
      paddle.anchor.setTo(0.5, 0.5);

      game.physics.enable(paddle, Phaser.Physics.ARCADE);

      paddle.body.collideWorldBounds = true;
      paddle.body.bounce.set(1);
      paddle.body.immovable = true;

      ball = game.add.sprite(game.world.centerX, paddle.y - 16, 'breakout', 'ball_1.png');
      ball.anchor.set(0.5);
      ball.checkWorldBounds = true;

      game.physics.enable(ball, Phaser.Physics.ARCADE);

      ball.body.collideWorldBounds = true;
      ball.body.bounce.set(1);

      ball.animations.add('spin', ['ball_1.png', 'ball_2.png', 'ball_3.png', 'ball_4.png', 'ball_5.png'], 50, true, false);

      ball.events.onOutOfBounds.add(ballLost, this);

      scoreText = game.add.text(10, 20, 'score: 0', { font: "20px Arial", fill: "#ffffff", align: "left" });
      livesText = game.add.text(width - 70, 20, 'lives: 3', { font: "20px Arial", fill: "#ffffff", align: "left" });
      levelText = game.add.text((width / 2) - 20, 20, 'level: ' + (currentLevel + 1), { font: "20px Arial", fill: "#ffffff", align: "left" });

      introText = game.add.text(game.world.centerX, height - 200, '- click to start -', { font: "40px Arial", fill: "#ffffff", align: "center" });
      introText.anchor.setTo(0.5, 0.5);

      game.input.onDown.add(releaseBall, this);

    }
    function update() {

      //  Fun, but a little sea-sick inducing :) Uncomment if you like!
      //s.tilePosition.x += (game.input.speed.x / 2);

      paddle.x = game.input.x;

      if (paddle.x < 24) {
        paddle.x = 24;
      }
      else if (paddle.x > game.width - 24) {
        paddle.x = game.width - 24;
      }

      if (ballOnPaddle) {
        ball.body.x = paddle.x;
      }
      else {
        game.physics.arcade.collide(ball, paddle, ballHitPaddle, null, this);
        game.physics.arcade.collide(ball, bricks, ballHitBrick, null, this);
        game.physics.arcade.collide(paddle, items, itemHitPaddle, null, this);
      }

    }

    function releaseBall() {

      if (ballOnPaddle) {
        ballOnPaddle = false;
        ball.body.velocity.y = -300;
        ball.body.velocity.x = -75;
        ball.animations.play('spin');
        introText.visible = false;
      }

    }

    function ballLost() {

      lives--;
      livesText.text = 'lives: ' + lives;

      if (lives === 0) {
        gameOver();
      }
      else {
        ballOnPaddle = true;

        ball.reset(paddle.body.x + 16, paddle.y - 16);

        ball.animations.stop();
      }

    }

    function gameOver() {

      ball.body.velocity.setTo(0, 0);

      introText.text = 'Game Over!';
      introText.visible = true;

    }

    function ballHitBrick(_ball, _brick) {

      _brick.animations.play("brick_die", 15);  //just play
      _brick.events.onAnimationComplete.add(onAnimationCompleteBrick, _brick);

      sounds.brickDeath.play();

      if (bricksWithItems.indexOf(_brick.name) > -1) {
        dropItem(_brick.x, _brick.y);
      }
    }

    function onAnimationCompleteBrick(sprite, animation) {

      //check which animation was finished
      if (animation.name == "brick_die") {
        sprite.kill(); //working kill a brick 
      }

      score += 10;

      scoreText.text = 'score: ' + score;

      //  Are they any bricks left?
      if (bricks.countLiving() == 0) {
        //  New level starts
        scoreText.text = 'score: ' + score;

        currentLevel++;

        if (currentLevel > breakoutLevels.length) {
          // you won!
        }
        else {
          introText.visible = true;
          introText.text = '- Level ' + (currentLevel + 1) + ' -';
          levelText.text = 'level: ' + (currentLevel + 1);
          populateLevel(currentLevel);
        }

        //  Let's move the ball back to the paddle
        ballOnPaddle = true;
        ball.body.velocity.set(0);
        ball.x = paddle.x + 16;
        ball.y = paddle.y - 16;
        ball.animations.stop();
      }
    }

    function ballHitPaddle(_ball, _paddle) {

      var diff = 0;

      if (_ball.x < _paddle.x) {
        //  Ball is on the left-hand side of the paddle
        diff = _paddle.x - _ball.x;
        _ball.body.velocity.x = (-10 * diff);
      }
      else if (_ball.x > _paddle.x) {
        //  Ball is on the right-hand side of the paddle
        diff = _ball.x - _paddle.x;
        _ball.body.velocity.x = (10 * diff);
      }
      else {
        //  Ball is perfectly in the middle
        //  Add a little random X to stop it bouncing straight up!
        _ball.body.velocity.x = 2 + Math.random() * 8;
      }

      sounds.hitPaddle.play();
    }

    function loadLevels() {

      currentLevel = 0;

      var r = 'red';
      var b = 'blue';
      var o = 'orange';
      var g = 'green';
      var X = null;

      //you can uncoment the dev level and or/add a level of your own
      //powerUps are not picked from the values bellow but set with: this.dropItemLimit
      breakoutLevels = [
        /*{
         name: "debug level",
         bricks: [
         [b, g, o, g, o, g, b, b, b],
         [b, b, b, b, b, b, b, b, b],
         [g, b, r, b, r, b, g, b, b],
         [g, b, b, b, b, b, g, b, b]
         ],
         powerUps: 1,
         powerDowns: 1
         },*/
        {
          name: "letsa begin",
          bricks: [
            [X, X, g, o, g, X, X],
            [o, b, g, g, g, b, o],
            [X, b, b, b, b, b, X]
          ],
          powerUps: 1,
          powerDowns: 1
        },
        {
          name: "how's it going?",
          bricks: [
            [X, g, o, g, o, g, X],
            [X, b, b, b, b, b, X],
            [g, b, r, b, r, b, g],
            [g, b, b, b, b, b, g],
            [g, b, X, X, X, b, g],
            [X, b, b, b, b, b, X]
          ],
          powerUps: 1,
          powerDowns: 1
        },
        {
          name: 'tie fighta!',
          bricks: [
            [X, b, X, g, X, b, X],
            [b, X, b, o, b, X, b],
            [b, g, b, o, b, g, b],
            [b, X, b, o, b, X, b],
            [X, b, X, X, X, b, X],
            [r, X, r, X, r, X, r]
          ],
          powerUps: 2,
          powerDowns: 2
        },
        {
          name: 'swirl',
          bricks: [
            [r, g, o, b, r, g, o],
            [b, X, X, X, X, X, X],
            [o, X, o, b, r, g, o],
            [g, X, g, X, X, X, b],
            [r, X, r, X, r, X, r],
            [b, X, b, o, g, X, g],
            [o, X, X, X, X, X, o],
            [g, r, b, o, g, r, b]
          ],
          powerUps: 2,
          powerDowns: 3
        }
      ];

    }

    function populateLevel(level) {

      //reset items
      if (level > 0) bricks.destroy();

      bricks = game.add.group();
      bricks.enableBody = true;
      bricks.physicsBodyType = Phaser.Physics.ARCADE;

      var Level = breakoutLevels[level];

      for (var y = 0; y < Level.bricks.length; ++y) {
        for (var x = 0; x < Level.bricks[y].length; ++x) {

          var color = Level.bricks[y][x];

          if (color) {

            var tempBrick;

            var bID = 1;
            if (color == "red") {
              bID = 2;
            } else if (color == "blue") {
              bID = 1;
            } else if (color == "orange") {
              bID = 3;
            } else if (color == "green") {
              bID = 4;
            }

            tempBrick = bricks.create(x * 32 + 64, y * 16 + 64, 'breakout', 'brick_' + bID + '_1.png');
            tempBrick.animations.add('idle', ['brick_' + bID + '_1.png'], 10, false, false);
            tempBrick.diedie = tempBrick.animations.add('brick_die', [
              'brick_' + bID + '_1.png',
              'brick_' + bID + '_2.png',
              'brick_' + bID + '_3.png',
              'brick_' + bID + '_4.png'
            ], 10, false, false);
            tempBrick.animations.add('brick_popin', [
              'brick_' + bID + '_4.png',
              'brick_' + bID + '_3.png',
              'brick_' + bID + '_2.png',
              'brick_' + bID + '_1.png'
            ], 10, false, false);
            var tempCount = 0;
            if (bricks.countLiving() > 0) {
              tempCount = bricks.countLiving();
            }
            tempBrick.name = 'brick' + (tempCount + 1);

            //tempBrick.frameName = 'brick_' + bID + '_1.png';
            //if you use this you must change the body size
            // and it's easier if it's set when sprite is created

            tempBrick.body.bounce.setTo(1);
            tempBrick.body.immovable = true;

            tempBrick.animations.play("brick_popin");

            bricks.add(tempBrick);

          }
        }
      }

      //Give some random bricks the abbility to drop items
      var dropItemLimit = Level.powerUps + Level.powerDowns;
      var brickPartLimit = Math.floor(bricks.countLiving() / dropItemLimit);
      var brickStartLimit = 1;
      var brickEndLimit = brickPartLimit;

      for (var dropCount = 0; dropCount < dropItemLimit; dropCount++) {

        var randomBrick = getRandomInt(brickStartLimit, brickEndLimit);

        //Get random value in range
        var randomBrickName = "brick" + randomBrick;
        bricksWithItems.push(randomBrickName);

        brickStartLimit = brickEndLimit + 1;
        brickEndLimit += brickPartLimit;
      }

      console.log(bricksWithItems)
    }

    function createSoundsAndMusic() {
      sounds.brickDeath = game.add.audio('brickDeath');
      sounds.hitPaddle = game.add.audio('hitPaddle');
      sounds.powerdown = game.add.audio('powerdown');
      sounds.powerup = game.add.audio('powerup');
      sounds.recover = game.add.audio('recover');
    }

    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function dropItem(dropItemInitialX, dropItemInitialY) {

      var typeFrame = "";
      var itemEffectName = "";

      if (Math.floor(Math.random() * 2)) {
        typeFrame = 'power_down.png';
        itemEffectName = "powerDown";
      } else {
        typeFrame = 'power_up.png';
        itemEffectName = "powerUp";
      }

      var dropItem;
      dropItem = items.create(
        getRandomInt(32, game.world.width - 64), -32, 'breakout', typeFrame);
      var tempCount = 0;
      if (items.countLiving() > 0) {
        tempCount = items.countLiving();
      }
      dropItem.name = 'item' + (tempCount + 1);

      //custom property
      dropItem.itemEffectName = itemEffectName;

      dropItem.body.x = dropItemInitialX;
      dropItem.body.y = dropItemInitialY;
      dropItem.body.velocity.y = 100;

      items.add(dropItem);
    }

    function itemHitPaddle(_paddle, _item) {
      if (_item.itemEffectName == "powerDown") {
        decreasePaddleSize();
        //play a sound
        sounds.powerdown.play();
      } else {
        increasePaddleSize();
        //play a sound
        sounds.powerup.play();
      }
      _item.kill();
      return true;
    }

    function decreasePaddleSize() {
      if (gemsTimer) {
        clearTimeout(gemsTimer);
      }

      var originalWidth = paddle.width;

      gemsTimer = setTimeout(function () {

        paddle.width = originalWidth;

        sounds.recover.play();

      }, gemTimeout);

      paddle.width /= 2;
    }

    function increasePaddleSize() {
      if (gemsTimer) {
        clearTimeout(gemsTimer);
      }

      var originalWidth = paddle.width;

      gemsTimer = setTimeout(function () {

        paddle.width = originalWidth;

        sounds.recover.play();
      }, gemTimeout);

      paddle.width *= 2;
    }
  })
})();