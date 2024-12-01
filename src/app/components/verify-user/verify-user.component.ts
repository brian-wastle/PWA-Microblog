import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { CognitoService } from '../../services/cognito/cognito.service';

@Component({
  selector: 'app-verify-user',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    MessageModule
  ],
  templateUrl: './verify-user.component.html',
  styleUrls: ['./verify-user.component.scss']
})
export class VerifyUserComponent implements OnInit {
  verifyForm: FormGroup;
  loading: boolean = false;
  errorMessage: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private cognitoService: CognitoService,
    private router: Router
  ) {
    this.verifyForm = this.formBuilder.group({
      verificationCode: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {}

  verifyUser(): void {
    if (this.verifyForm.invalid) {
      return;
    }

    const { verificationCode } = this.verifyForm.value;
    this.loading = true;
    this.errorMessage = null;

    this.cognitoService.confirmSignUp(verificationCode)
      .then(() => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
        console.log("Successful confirmation.")
      })
      .catch((err) => {
        this.loading = false;
        this.errorMessage = err.message;
      });
  }
}
