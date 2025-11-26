import React, { useEffect } from "react";
import { UIElement, ViewTransform } from "@/types";

interface UseCanvasRenderingProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  uiElements: UIElement[];
  transform: ViewTransform;
  videoDimensions: { w: number; h: number };
}

export function useCanvasRendering({
  canvasRef,
  containerRef,
  uiElements,
  transform,
  videoDimensions,
}: UseCanvasRenderingProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !containerRef.current) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = containerRef.current.getBoundingClientRect();

    const targetWidth = Math.round(rect.width * dpr);
    const targetHeight = Math.round(rect.height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.scale(dpr, dpr);

    uiElements.forEach((el) => {
      const sx = el.pos.x * transform.scale + transform.x;
      const sy = el.pos.y * transform.scale + transform.y;

      if (sx < -50 || sy < -50 || sx > rect.width + 50 || sy > rect.height + 50)
        return;

      ctx.fillStyle = el.color;

      if (el.isCurrent) {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
      }

      if (el.type === "circle") {
        ctx.beginPath();
        ctx.arc(sx, sy, el.radius, 0, Math.PI * 2);
        ctx.fill();
        if (el.isCurrent) ctx.stroke();
      } else {
        const side = el.radius * 2;
        const r = 2; // Border radius for rounded square
        const x = sx - el.radius;
        const y = sy - el.radius;

        ctx.beginPath();
        // Check for native roundRect support, otherwise fallback to standard rect
        if (ctx.roundRect) {
          ctx.roundRect(x, y, side, side, r);
        } else {
          // Manual rounded rect path if not supported
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + side - r, y);
          ctx.quadraticCurveTo(x + side, y, x + side, y + r);
          ctx.lineTo(x + side, y + side - r);
          ctx.quadraticCurveTo(x + side, y + side, x + side - r, y + side);
          ctx.lineTo(x + r, y + side);
          ctx.quadraticCurveTo(x, y + side, x, y + side - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
        }
        ctx.fill();
        if (el.isCurrent) ctx.stroke();
      }

      if (el.label) {
        ctx.fillStyle = "white";
        ctx.font = `${el.fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(el.label, sx, sy - el.radius - 4);
      }
    });
  }, [uiElements, transform, videoDimensions, canvasRef, containerRef]);
}
