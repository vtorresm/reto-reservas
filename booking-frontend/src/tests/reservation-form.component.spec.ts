import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReservationFormComponent } from '../reservations/reservation-form/reservation-form.component';
import { ReservationService } from '../reservations/reservation.service';
import { AlertService } from '../app/services/alert.service';

describe('ReservationFormComponent', () => {
  let component: ReservationFormComponent;
  let fixture: ComponentFixture<ReservationFormComponent>;
  let reservationServiceSpy: jasmine.SpyObj<ReservationService>;
  let alertServiceSpy: jasmine.SpyObj<AlertService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const reservationSpy = jasmine.createSpyObj('ReservationService', ['create']);
    const alertSpy = jasmine.createSpyObj('AlertService', [
      'showReservationSuccess',
      'showUserNotFound',
      'showRoomNotFound',
      'showScheduleConflict',
      'showReservationError'
    ]);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [ReservationFormComponent],
      imports: [
        ReactiveFormsModule,
        RouterTestingModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatCardModule,
        MatIconModule,
        MatDatepickerModule,
        MatNativeDateModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: ReservationService, useValue: reservationSpy },
        { provide: AlertService, useValue: alertSpy },
        { provide: Router, useValue: routerSpyObj }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ReservationFormComponent);
    component = fixture.componentInstance;
    reservationServiceSpy = TestBed.inject(ReservationService) as jasmine.SpyObj<ReservationService>;
    alertServiceSpy = TestBed.inject(AlertService) as jasmine.SpyObj<AlertService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values', () => {
      expect(component.form).toBeDefined();
      expect(component.form.get('userId')?.value).toBe(1);
      expect(component.form.get('roomId')?.value).toBe(1);
      expect(component.form.get('date')?.value).toBe('');
      expect(component.form.get('startTime')?.value).toBe('');
      expect(component.form.get('endTime')?.value).toBe('');
    });

    it('should have all required validators', () => {
      const userIdControl = component.form.get('userId');
      const roomIdControl = component.form.get('roomId');
      const dateControl = component.form.get('date');
      const startTimeControl = component.form.get('startTime');
      const endTimeControl = component.form.get('endTime');

      expect(userIdControl?.validator).toBeTruthy();
      expect(roomIdControl?.validator).toBeTruthy();
      expect(dateControl?.validator).toBeTruthy();
      expect(startTimeControl?.validator).toBeTruthy();
      expect(endTimeControl?.validator).toBeTruthy();
    });
  });

  describe('onSubmit', () => {
    it('should create reservation successfully', async () => {
      // Arrange
      const formData = {
        userId: 1,
        roomId: 1,
        date: '2025-09-30',
        startTime: '10:00',
        endTime: '11:00'
      };

      component.form.patchValue(formData);
      reservationServiceSpy.create.and.returnValue(of({}));
      alertServiceSpy.showReservationSuccess.and.returnValue(Promise.resolve());

      // Act
      component.onSubmit();

      // Assert
      expect(reservationServiceSpy.create).toHaveBeenCalledWith(formData);
      expect(alertServiceSpy.showReservationSuccess).toHaveBeenCalled();
    });

    it('should handle user not found error', async () => {
      // Arrange
      const formData = {
        userId: 1,
        roomId: 1,
        date: '2025-09-30',
        startTime: '10:00',
        endTime: '11:00'
      };

      component.form.patchValue(formData);
      const errorResponse = { error: { message: 'Usuario no encontrado' } };
      reservationServiceSpy.create.and.returnValue(throwError(errorResponse));

      // Act
      component.onSubmit();

      // Assert
      expect(reservationServiceSpy.create).toHaveBeenCalledWith(formData);
      expect(alertServiceSpy.showUserNotFound).toHaveBeenCalled();
    });

    it('should handle room not found error', async () => {
      // Arrange
      const formData = {
        userId: 1,
        roomId: 1,
        date: '2025-09-30',
        startTime: '10:00',
        endTime: '11:00'
      };

      component.form.patchValue(formData);
      const errorResponse = { error: { message: 'Sala no encontrada' } };
      reservationServiceSpy.create.and.returnValue(throwError(errorResponse));

      // Act
      component.onSubmit();

      // Assert
      expect(reservationServiceSpy.create).toHaveBeenCalledWith(formData);
      expect(alertServiceSpy.showRoomNotFound).toHaveBeenCalled();
    });

    it('should handle schedule conflict error', async () => {
      // Arrange
      const formData = {
        userId: 1,
        roomId: 1,
        date: '2025-09-30',
        startTime: '10:00',
        endTime: '11:00'
      };

      component.form.patchValue(formData);
      const errorResponse = { error: { message: 'No se puede reservar: solapamiento de horario' } };
      reservationServiceSpy.create.and.returnValue(throwError(errorResponse));

      // Act
      component.onSubmit();

      // Assert
      expect(reservationServiceSpy.create).toHaveBeenCalledWith(formData);
      expect(alertServiceSpy.showScheduleConflict).toHaveBeenCalled();
    });

    it('should handle generic error', async () => {
      // Arrange
      const formData = {
        userId: 1,
        roomId: 1,
        date: '2025-09-30',
        startTime: '10:00',
        endTime: '11:00'
      };

      component.form.patchValue(formData);
      const errorResponse = { error: { message: 'Error genérico' } };
      reservationServiceSpy.create.and.returnValue(throwError(errorResponse));

      // Act
      component.onSubmit();

      // Assert
      expect(reservationServiceSpy.create).toHaveBeenCalledWith(formData);
      expect(alertServiceSpy.showReservationError).toHaveBeenCalledWith('Error genérico');
    });

    it('should not submit when form is invalid', () => {
      // Arrange
      component.form.patchValue({
        userId: '',
        roomId: '',
        date: '',
        startTime: '',
        endTime: ''
      });

      // Act
      component.onSubmit();

      // Assert
      expect(reservationServiceSpy.create).not.toHaveBeenCalled();
    });

    it('should navigate to reservations list after successful creation', async () => {
      // Arrange
      const formData = {
        userId: 1,
        roomId: 1,
        date: '2025-09-30',
        startTime: '10:00',
        endTime: '11:00'
      };

      component.form.patchValue(formData);
      reservationServiceSpy.create.and.returnValue(of({}));
      alertServiceSpy.showReservationSuccess.and.returnValue(Promise.resolve());

      // Act
      component.onSubmit();

      // Wait for promise resolution
      await fixture.whenStable();

      // Assert
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/reservations/list']);
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', () => {
      const form = component.form;

      // Initially form should be invalid
      expect(form.valid).toBeFalsy();

      // Set required values
      form.patchValue({
        userId: 1,
        roomId: 1,
        date: '2025-09-30',
        startTime: '10:00',
        endTime: '11:00'
      });

      // Now form should be valid
      expect(form.valid).toBeTruthy();
    });

    it('should not submit when form is invalid', () => {
      // Arrange
      component.form.patchValue({
        userId: '',
        roomId: '',
        date: '',
        startTime: '',
        endTime: ''
      });

      // Act
      component.onSubmit();

      // Assert
      expect(reservationServiceSpy.create).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle error without message', async () => {
      // Arrange
      const formData = {
        userId: 1,
        roomId: 1,
        date: '2025-09-30',
        startTime: '10:00',
        endTime: '11:00'
      };

      component.form.patchValue(formData);
      const errorResponse = { error: {} };
      reservationServiceSpy.create.and.returnValue(throwError(errorResponse));

      // Act
      component.onSubmit();

      // Assert
      expect(alertServiceSpy.showReservationError).toHaveBeenCalledWith('Error desconocido');
    });

    it('should handle network error', async () => {
      // Arrange
      const formData = {
        userId: 1,
        roomId: 1,
        date: '2025-09-30',
        startTime: '10:00',
        endTime: '11:00'
      };

      component.form.patchValue(formData);
      reservationServiceSpy.create.and.returnValue(throwError('Network error'));

      // Act
      component.onSubmit();

      // Assert
      expect(alertServiceSpy.showReservationError).toHaveBeenCalledWith('Error desconocido');
    });
  });
});