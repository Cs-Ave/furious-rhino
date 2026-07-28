import { Constants } from '../utils/Constants.js';

export class FurySystem {
  constructor(scene) {
    this.scene = scene;
    this.furyRatio = 0;

    // Fire icon next to the dash cooldown icon, same fill-from-bottom style
    const iconX = Constants.GAME_WIDTH - Constants.HUD_MARGIN - 130;
    const iconY = Constants.HUD_MARGIN + 30;

    this.fireIconEmpty = scene.add.sprite(iconX, iconY, 'fury-fire-empty')
      .setScrollFactor(0).setDepth(100);
    this.fireIconFull = scene.add.sprite(iconX, iconY, 'fury-fire-full')
      .setScrollFactor(0).setDepth(101);

    // Manual-emission smoke emitter in world space (follows the rhino's snout)
    this.smokeEmitter = scene.add.particles(0, 0, 'smoke-puff', {
      speed: { min: 10, max: 40 },
      angle: { min: 250, max: 290 },
      alpha: { start: 0.6, end: 0 },
      scale: { start: 0.4, end: 1.2 },
      lifespan: 700,
      frequency: -1,
    });
    this.smokeEmitter.setDepth(5);
  }

  update(rhino) {
    this.furyRatio = rhino.getFuryRatio();

    this.updateFireIcon();
    this.updateRhinoTint(rhino);
    this.updateSmoke(rhino);

    const speedMultiplier = 1 + this.furyRatio * 0.5;
    rhino.getSprite().body.setVelocityX(
      (rhino.dashState === 'active' ? Constants.DASH_SPEED : Constants.RUN_SPEED) * speedMultiplier
    );
  }

  updateFireIcon() {
    // Bottom-up reveal of the colored flame, same math as the dash icon
    const size = Constants.DASH_ICON_SIZE;
    const h = size * this.furyRatio;
    this.fireIconFull.setCrop(0, size - h, size, h);
  }

  updateRhinoTint(rhino) {
    // Tint multiplies the texture: white = no change, so interpolate
    // white -> red for a red flush that never darkens the light-gray art
    const blended = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(0xffffff),
      Phaser.Display.Color.IntegerToColor(Constants.COLORS.redFury),
      100,
      Math.floor(this.furyRatio * 60) // subtle: never fully red, always recognizably gray
    );
    const tint = Phaser.Display.Color.GetColor(blended.r, blended.g, blended.b);
    rhino.getSprite().setTint(tint);
  }

  updateSmoke(rhino) {
    const sprite = rhino.getSprite();
    const snoutX = sprite.x + Constants.SNOUT_OFFSET_X;
    const snoutY = sprite.y + Constants.SNOUT_OFFSET_Y;

    // Emission probability per frame scales with fury (none when calm)
    const chance = Phaser.Math.Linear(0.01, 0.3, this.furyRatio);
    if (Math.random() < chance) {
      this.smokeEmitter.emitParticleAt(snoutX, snoutY);
    }
  }
}
