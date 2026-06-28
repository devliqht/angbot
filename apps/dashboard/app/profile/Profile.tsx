"use client";

import { useContext } from "react";
import { MainContext } from "../context/Main_Context";

interface DiscordServer {
  id: string;
  name: string;
  iconColor: string;
  iconLetter: string;
}

const servers: DiscordServer[] = [
  {
    id: "1",
    name: "Example Discord Server Name",
    iconColor: "#ed4245",
    iconLetter: "E",
  },
  {
    id: "2",
    name: "Example Discord Server Name",
    iconColor: "#1752f0",
    iconLetter: "E",
  },
  {
    id: "3",
    name: "Example Discord Server Name",
    iconColor: "#eb459e",
    iconLetter: "E",
  },
];

const UserCircleIcon = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <circle cx="40" cy="40" r="40" fill="#202127" />
    <circle cx="40" cy="30" r="14" fill="#3a3a3a" />
    <ellipse cx="40" cy="72" rx="24" ry="18" fill="#3a3a3a" />
  </svg>
);

function ServerIcon({
  color,
  letter,
}: {
  color: string;
  letter: string;
}) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {letter}
    </div>
  );
}

export default function Profile() {
  const context = useContext(MainContext);

  if (!context) {
    throw new Error("Error in main page");
  }

  return (
    <div className="flex flex-col">
      <div className="mb-8 flex items-center gap-5">
        <UserCircleIcon />
        <h1 className="text-3xl font-bold text-white">
          Discord Username
        </h1>
      </div>

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
          Discord Servers
        </p>

        <div className="flex max-w-[700px] flex-col gap-2">
          {servers.map((server) => (
            <div
              key={server.id}
              className="flex cursor-pointer items-center gap-4 rounded-lg border px-5 py-4 transition-colors duration-150 hover:bg-[#2a2a2a]"
              style={{
                backgroundColor: "#202127",
                borderColor: "#2a2a2a",
              }}
            >
              <ServerIcon
                color={server.iconColor}
                letter={server.iconLetter}
              />
              <span className="text-sm font-medium text-white">
                {server.name}
              </span>
            </div>
          ))}
        </div>

        <button className="mt-5 rounded-full bg-[#1752f0] px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#368bfe]">
          Add Server
        </button>
      </div>
    </div>
  );
}