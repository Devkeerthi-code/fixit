import { request } from "./client";
import type {
  BlockInput,
  BlockView,
  CategoryView,
  CreateHostelRequest,
  HostelLookup,
  HostelSettings,
  JoinRequest,
  Me,
  SetSkillsRequest,
  StaffView,
  UpdateCategoryRequest,
  UpdateHostelRequest,
} from "./types";

export const hostelApi = {
  create: (body: CreateHostelRequest) => request<Me>("/api/hostels", { method: "POST", json: body }),
  lookup: (code: string) => request<HostelLookup>("/api/hostels/lookup", { method: "POST", json: { code } }),
  join: (body: JoinRequest) => request<Me>("/api/hostels/join", { method: "POST", json: body }),
  settings: () => request<HostelSettings>("/api/hostel"),
  update: (body: UpdateHostelRequest) => request<HostelSettings>("/api/hostel", { method: "PUT", json: body }),
  rotateCodes: () => request<HostelSettings>("/api/hostel/invite-codes/rotate", { method: "POST" }),
  layout: () => request<BlockView[]>("/api/hostel/layout"),
  addBlock: (body: BlockInput) => request<BlockView[]>("/api/hostel/blocks", { method: "POST", json: body }),
  addRooms: (blockId: number, rooms: string) =>
    request<BlockView[]>(`/api/hostel/blocks/${blockId}/rooms`, { method: "POST", json: { rooms } }),
  categories: () => request<CategoryView[]>("/api/hostel/categories"),
  updateCategory: (id: number, body: UpdateCategoryRequest) =>
    request<CategoryView[]>(`/api/hostel/categories/${id}`, { method: "PUT", json: body }),
  team: () => request<StaffView[]>("/api/hostel/team"),
  setSkills: (staffId: number, body: SetSkillsRequest) =>
    request<StaffView[]>(`/api/hostel/team/${staffId}/skills`, { method: "PUT", json: body }),
  setActive: (userId: number, active: boolean) =>
    request<StaffView[]>(`/api/hostel/team/${userId}/active`, { method: "PUT", json: { active } }),
};
