"use client";

import React from "react";

interface RowItemProps {
  icon: React.ReactNode;
  name: string;
  location?: string;
  createdAt: string;
  rightExtra?: React.ReactNode;
}

export default function RowItem({ icon, name, location, createdAt, rightExtra }: RowItemProps) {
  return (
    <div className="row-item">
      <div className="left">
        {icon}
        <div className="title-block">
          <div className="name" title={name}>{name}</div>
          {location && (
            <div className="location" title={location}>{location}</div>
          )}
        </div>
      </div>
      <div className="right">
        {rightExtra}
        <div className="date">{createdAt}</div>
      </div>
    </div>
  );
}
