import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Room {
  id: string;
  name: string;
  capacity: number;
  description?: string;
  location?: string;
  amenities?: string[];
  equipment?: string[];
  isAvailable: boolean;
  color: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  private apiUrl = 'http://localhost:3000/rooms';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Room[]> {
    return this.http.get<Room[]>(this.apiUrl);
  }

  getAvailable(): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.apiUrl}/available`);
  }

  getById(id: string): Observable<Room> {
    return this.http.get<Room>(`${this.apiUrl}/${id}`);
  }

  getByCapacity(minCapacity: number): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.apiUrl}/capacity?minCapacity=${minCapacity}`);
  }

  getByType(type: string): Observable<Room[]> {
    return this.http.get<Room[]>(`${this.apiUrl}/type/${type}`);
  }

  create(room: Partial<Room>): Observable<Room> {
    return this.http.post<Room>(this.apiUrl, room);
  }

  update(id: string, room: Partial<Room>): Observable<Room> {
    return this.http.put<Room>(`${this.apiUrl}/${id}`, room);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleAvailability(id: string): Observable<Room> {
    return this.http.patch<Room>(`${this.apiUrl}/${id}/availability`, {});
  }
}
