import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

@Pipe({
  name: 'ociImage'
})
export class OciImagePipe implements PipeTransform {
  transform(value: string | undefined | null): string | null {
    if (!value || value.startsWith('http') || value.startsWith('data:')) {
      return value || null;
    }
    
    const namespace = 'gry0vdpdppo2';
    const region = 'sa-saopaulo-1';
    // Se a propriedade ociBucket não existir no environment, assume um fallback por precaução
    const bucket = (environment as any).ociBucket || 'imagens-produtos-dev';
    
    return `https://${namespace}.objectstorage.${region}.oci.customer-oci.com/n/${namespace}/b/${bucket}/o/${value}`;
  }
}
