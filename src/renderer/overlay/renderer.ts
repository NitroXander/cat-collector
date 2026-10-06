// Pixi compiles shaders at runtime and needs eval. The overlay CSP forbids it,
// so opt in through Pixi's own module rather than loosening the policy.
import 'pixi.js/unsafe-eval'
import { Application, Container } from 'pixi.js'

export interface Scene {
  app: Application
  cats: Container
  width: number
  height: number
  destroy(): void
}

export async function createScene(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): Promise<Scene> {
  const app = new Application()
  await app.init({
    canvas,
    width,
    height,
    backgroundAlpha: 0,
    antialias: false,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
    preference: 'webgl'
  })

  const cats = new Container()
  app.stage.addChild(cats)

  return {
    app,
    cats,
    width,
    height,
    destroy() {
      app.destroy(true, { children: true })
    }
  }
}
