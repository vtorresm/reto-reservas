import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl = 'http://localhost:3000/reservations';

  constructor(private http: HttpClient) { }

  create(reservation: any): Observable<any> {
    return this.http.post(this.apiUrl, reservation);
  }

  getAll(date?: string): Observable<any[]> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<any[]>(this.apiUrl, { params });
  }
}