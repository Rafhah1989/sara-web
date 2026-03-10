import { Component, OnInit } from '@angular/core';
import { SpinnerService } from '../../services/spinner.service';

@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.css']
})
export class SpinnerComponent implements OnInit {

  isLoading: boolean = false;

  constructor(private spinnerService: SpinnerService) { }

  ngOnInit(): void {
    this.spinnerService.isLoading.subscribe((loading: boolean) => {
      // Usar setTimeout puramente estrutural para evitar NG0100 (ExpressionChangedAfterItHasBeenCheckedError)
      setTimeout(() => {
        this.isLoading = loading;
      });
    });
  }
}
