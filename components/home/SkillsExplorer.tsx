"use client";

import { useState } from "react";
import { SKILLS } from "./skills-data";

const AVA = "/assets/img/ava-avatar.webp";
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The skills tab list and the dark demo panel with its live chat card.
 *
 * Animations come from home.css: bubbles and chips play in under `.hb-js .is-in`, and the
 * number, title and description replay `.hb-swap` on every change after the first. Keying
 * those elements on the selected skill remounts them, which restarts their animations.
 * The panel's own className never changes, so the `is-in` class public/assets/motion.js adds is left alone.
 */
export function SkillsExplorer() {
  const [picked, setPicked] = useState(0);
  const [changed, setChanged] = useState(false);
  const pick = (i: number) => {
    setPicked((i + SKILLS.length) % SKILLS.length);
    setChanged(true);
  };
  const s = SKILLS[picked]!;
  const swap = changed ? "hb-swap" : undefined;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "stretch" }}>
      {/* Skill list. Only aria-selected flips, so the CSS transitions on the selected state play. */}
      <div
        suppressHydrationWarning
        id="sk-list"
        className="hb-reveal"
        role="tablist"
        aria-label="Coordinator skills"
        style={{ flex: "1 1 340px", minWidth: "0", display: "flex", flexDirection: "column", gap: "6px" }}
      >
        {SKILLS.map((skill, i) => (
          <button key={skill.title} role="tab" aria-selected={i === picked} onClick={() => pick(i)}>
            <span className="sk-n">{pad(i + 1)}</span>
            <span className="sk-t">{skill.title}</span>
            <span className="sk-a" aria-hidden="true">
              →
            </span>
          </button>
        ))}
      </div>

      {/* Demo panel */}
      <div
        suppressHydrationWarning
        role="tabpanel"
        className="hb-reveal"
        style={{
          flex: "999 1 560px",
          minWidth: "0",
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          minHeight: "640px",
          borderRadius: "28px",
          background: "#0d0a17",
          color: "#f0eef8",
          padding: "40px",
          display: "flex",
          flexWrap: "wrap",
          gap: "32px",
          alignItems: "center",
        }}
      >
        <div
          className="hb-orb"
          aria-hidden="true"
          style={{
            position: "absolute",
            width: "640px",
            height: "640px",
            right: "-220px",
            top: "-200px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(83,48,249,0.42) 0%, rgba(83,48,249,0) 66%)",
          }}
        />
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: "0", display: "flex", flexDirection: "column", gap: "16px" }}>
          <span
            style={{
              fontFamily: "'Sweet Sans Pro', 'Montserrat', Helvetica, Arial, sans-serif",
              fontWeight: "500",
              textTransform: "uppercase",
              fontSize: "11.5px",
              letterSpacing: "0.16em",
              color: "#b9a9ff",
            }}
          >
            {"Skill "}
            <span key={`n${picked}`} id="sk-num" className={swap}>
              {pad(picked + 1)}
            </span>
            {` / ${pad(SKILLS.length)}`}
          </span>
          <span
            key={`t${picked}`}
            id="sk-title"
            className={swap}
            style={{
              fontFamily: "'DM Sans', 'DM Sans Fallback', Helvetica, Arial, sans-serif",
              fontWeight: "600",
              fontSize: "clamp(26px, 1.6vw + 20px, 34px)",
              lineHeight: "1.1",
              letterSpacing: "-0.02em",
            }}
          >
            {s.title}
          </span>
          <p
            key={`d${picked}`}
            id="sk-desc"
            className={swap}
            style={{ margin: "0", fontSize: "17px", lineHeight: "1.6", color: "#a79fbf" }}
          >
            {s.desc}
          </p>
          <div style={{ display: "flex", gap: "10px", paddingTop: "8px" }}>
            <button
              aria-label="Previous skill"
              id="sk-prev"
              className="hb-ghost"
              onClick={() => pick(picked - 1)}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "999px",
                border: "1px solid #322b47",
                background: "transparent",
                color: "#f0eef8",
                padding: "0",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M14 9H4M8.5 4.5 4 9l4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              aria-label="Next skill"
              id="sk-next"
              className="hb-ghost"
              onClick={() => pick(picked + 1)}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "999px",
                border: "1px solid #322b47",
                background: "transparent",
                color: "#f0eef8",
                padding: "0",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M4 9h10M9.5 4.5 14 9l-4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Live chat card */}
        <div
          style={{
            position: "relative",
            flex: "1 1 320px",
            minWidth: "0",
            maxWidth: "400px",
            margin: "0 auto",
            boxSizing: "border-box",
            background: "#F6F1F8",
            color: "#1E1530",
            fontFamily: "'DM Sans', 'DM Sans Fallback', sans-serif",
            borderRadius: "24px",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            boxShadow: "0 40px 80px -30px rgba(83,48,249,0.55)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "12px", borderBottom: "1px solid #E6DDEE" }}>
            <span style={{ position: "relative", width: "40px", height: "40px", flex: "none" }}>
              <img
                width="40"
                height="40"
                loading="lazy"
                decoding="async"
                src={AVA}
                alt=""
                style={{ width: "40px", height: "40px", borderRadius: "999px", objectFit: "cover", display: "block" }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "0",
                  bottom: "0",
                  width: "10px",
                  height: "10px",
                  borderRadius: "999px",
                  background: "#2F8A5F",
                  border: "2px solid #F6F1F8",
                }}
              />
            </span>
            <span style={{ flex: "1", display: "flex", flexDirection: "column", lineHeight: "1.25" }}>
              <span style={{ fontSize: "15px", fontWeight: "600" }}>Ava from Solenne</span>
              <span style={{ fontSize: "12px", color: "#5C5170" }}>AI Treatment Coordinator</span>
            </span>
            <span style={{ fontSize: "12px", color: "#5C5170" }} id="sk-time">
              {s.time}
            </span>
          </div>

          {/* Bubbles arrive one after another like a live conversation. */}
          <div key={`m${picked}`} id="sk-msgs" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {s.messages.map((m, i) => {
              const animationDelay = `${(0.12 + i * 0.38).toFixed(2)}s`;
              return m.who === "you" ? (
                <div
                  key={i}
                  style={{
                    animationDelay,
                    transformOrigin: "100% 100%",
                    alignSelf: "flex-end",
                    maxWidth: "82%",
                    background: "#4B1E7A",
                    color: "#FFFFFF",
                    padding: "10px 14px",
                    borderRadius: "18px 18px 4px 18px",
                    fontSize: "15px",
                    lineHeight: "1.45",
                  }}
                >
                  {m.text}
                </div>
              ) : (
                <div key={i} style={{ animationDelay, transformOrigin: "0 100%", display: "flex", gap: "8px", alignItems: "flex-end" }}>
                  <img
                    src={AVA}
                    width="28"
                    height="28"
                    alt=""
                    style={{ width: "28px", height: "28px", borderRadius: "999px", objectFit: "cover", flex: "none" }}
                  />
                  <div
                    style={{
                      maxWidth: "86%",
                      background: "#FFFFFF",
                      border: "1px solid #E6DDEE",
                      padding: "12px 14px",
                      borderRadius: "18px 18px 18px 4px",
                      fontSize: "15px",
                      lineHeight: "1.5",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
          </div>
          <div
            key={`c${picked}`}
            id="sk-chips"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              justifyContent: "flex-end",
              animationDelay: `${(0.12 + s.messages.length * 0.38).toFixed(2)}s`,
            }}
          >
            {s.chips.map((c) => (
              <span
                key={c}
                style={{
                  minHeight: "40px",
                  padding: "0 14px",
                  borderRadius: "999px",
                  border: "1px solid #4B1E7A",
                  background: "#FFFFFF",
                  color: "#4B1E7A",
                  fontSize: "14px",
                  fontWeight: "600",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                {c}
              </span>
            ))}
          </div>
          <p style={{ margin: "4px 0 0", textAlign: "center", fontSize: "11px", color: "#5C5170" }}>
            Ava is an AI assistant · Talk to a person
          </p>
        </div>
      </div>
    </div>
  );
}
