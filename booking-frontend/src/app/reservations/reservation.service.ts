import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Reservation {
  id: string;
  userId: string;
  roomId: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  notes?: string;
  attendees?: number;
  title?: string;
  user?: any;
  room?: any;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root',
})
export class ReservationService {
  private apiUrl = 'http://localhost:3000/reservations';

  constructor(private http: HttpClient) {}

  create(reservation: Partial<Reservation>): Observable<Reservation> {
    return this.http.post<Reservation>(this.apiUrl, reservation);
  }

  getAll(date?: string, userId?: string): Observable<Reservation[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    if (userId) {
      params = params.set('userId', userId);
    }
    return this.http.get<Reservation[]>(this.apiUrl, { params });
  }

  getById(id: string): Observable<Reservation> {
    return this.http.get<Reservation>(`${this.apiUrl}/${id}`);
  }

  getUserReservations(userId: string): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.apiUrl}/user/${userId}`);
  }

  getRoomReservations(roomId: string, date?: string): Observable<Reservation[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<Reservation[]>(`${this.apiUrl}/room/${roomId}`, { params });
  }

  update(
    id: string,
    reservation: Partial<Reservation>,
    userId: string,
  ): Observable<Reservation> {
    const params = new HttpParams().set('userId', userId);
    return this.http.put<Reservation>(`${this.apiUrl}/${id}`, reservation, { params });
  }

  cancel(id: string, userId: string): Observable<Reservation> {
    const params = new HttpParams().set('userId', userId);
    return this.http.post<Reservation>(`${this.apiUrl}/${id}/cancel`, {}, { params });
  }

  delete(id: string, userId: string): Observable<void> {
    const params = new HttpParams().set('userId', userId);
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { params });
  }
}
