"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DrivePlan } from "@/lib/types";

// Fix Leaflet's default icon path issue in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

/** Color palette for each day of the week */
const DAY_COLORS: Record<string, string> = {
  Monday: "#3B82F6",    // blue
  Tuesday: "#10B981",   // green
  Wednesday: "#F59E0B", // orange
  Thursday: "#8B5CF6",  // purple
  Friday: "#EF4444",    // red
};

/** Creates a colored circle marker icon */
function createDayIcon(day: string) {
  const color = DAY_COLORS[day] || "#6B7280";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

/** Auto-fits the map to show all markers */
function FitBounds({ plan }: { plan: DrivePlan }) {
  const map = useMap();

  useEffect(() => {
    const coords: [number, number][] = [];
    plan.daily_schedule.forEach((day) => {
      day.visits.forEach((visit) => {
        if (visit.latitude && visit.longitude) {
          coords.push([visit.latitude, visit.longitude]);
        }
      });
    });

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [plan, map]);

  return null;
}

interface DrivePlanMapProps {
  plan: DrivePlan;
  selectedDay?: string | null;
}

/**
 * Interactive map showing the drive plan with color-coded markers per day.
 * Optionally filters to show only a selected day.
 */
export default function DrivePlanMap({ plan, selectedDay }: DrivePlanMapProps) {
  const schedulesToShow = selectedDay
    ? plan.daily_schedule.filter((d) => d.day === selectedDay)
    : plan.daily_schedule;

  return (
    <MapContainer
      center={[39.8283, -98.5795]} // Center of US as default
      zoom={4}
      className="h-full w-full rounded-lg"
      style={{ minHeight: "400px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds plan={plan} />

      {schedulesToShow.map((day) => {
        const color = DAY_COLORS[day.day] || "#6B7280";
        const routeCoords: [number, number][] = [];

        return (
          <div key={day.day}>
            {day.visits.map((visit) => {
              if (!visit.latitude || !visit.longitude) return null;
              routeCoords.push([visit.latitude, visit.longitude]);

              return (
                <Marker
                  key={`${day.day}-${visit.order}`}
                  position={[visit.latitude, visit.longitude]}
                  icon={createDayIcon(day.day)}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold">{visit.facility_name}</p>
                      <p className="text-gray-600">{visit.facility_address}</p>
                      <p className="mt-1 text-xs">
                        <span className="font-medium" style={{ color }}>
                          {day.day} — Stop #{visit.order}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">{visit.reason}</p>
                      {visit.estimated_drive_time && (
                        <p className="text-xs text-gray-400 mt-1">
                          🚗 {visit.estimated_drive_time}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            {/* Draw route line for this day */}
            {routeCoords.length > 1 && (
              <Polyline
                positions={routeCoords}
                pathOptions={{ color, weight: 3, opacity: 0.7, dashArray: "8 4" }}
              />
            )}
          </div>
        );
      })}
    </MapContainer>
  );
}
