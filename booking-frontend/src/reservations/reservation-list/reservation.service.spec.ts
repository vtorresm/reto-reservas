import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReservationService } from './reservation.service';

describe('ReservationService', () => {
  let service: ReservationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReservationService]
    });
    service = TestBed.inject(ReservationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create a reservation', () => {
    const mockDto = { userId: 1, roomId: 1, date: '2025-09-30', startTime: '10:00', endTime: '11:00' };
    service.create(mockDto).subscribe(response => {
      expect(response).toBeTruthy();
    });
    const req = httpMock.expectOne(service['apiUrl']);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should get all reservations', () => {
    service.getAll().subscribe(reservations => {
      expect(reservations.length).toBe(0);
    });
    const req = httpMock.expectOne(service['apiUrl']);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});