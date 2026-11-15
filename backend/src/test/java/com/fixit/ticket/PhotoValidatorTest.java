package com.fixit.ticket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fixit.common.AppException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

class PhotoValidatorTest {

    private final PhotoValidator validator = new PhotoValidator();

    private static byte[] jpeg(int size) {
        byte[] b = new byte[size];
        b[0] = (byte) 0xFF;
        b[1] = (byte) 0xD8;
        b[2] = (byte) 0xFF;
        return b;
    }

    private static MultipartFile file(byte[] bytes, String claimedType) {
        return new MockMultipartFile("photos", "p.jpg", claimedType, bytes);
    }

    @Test
    void acceptsUpToThreeSmallJpegs() {
        List<MultipartFile> files = List.of(file(jpeg(1000), "image/jpeg"), file(jpeg(2000), "image/jpeg"));
        assertThat(validator.validate(files)).hasSize(2).allMatch(p -> p.contentType().equals("image/jpeg"));
    }

    @Test
    void detectsWebpByMagicBytes() {
        byte[] webp = "RIFF\0\0\0\0WEBPVP8 ".getBytes();
        assertThat(PhotoValidator.detectType(webp)).isEqualTo("image/webp");
    }

    @Test
    void rejectsFourPhotos() {
        List<MultipartFile> four = List.of(file(jpeg(10), "image/jpeg"), file(jpeg(10), "image/jpeg"),
                file(jpeg(10), "image/jpeg"), file(jpeg(10), "image/jpeg"));
        assertCode(four, "TOO_MANY_PHOTOS");
    }

    @Test
    void rejectsOversizedPhoto() {
        assertCode(List.of(file(jpeg(PhotoValidator.MAX_BYTES + 1), "image/jpeg")), "PHOTO_TOO_LARGE");
    }

    @Test
    void ignoresTheClaimedContentTypeAndChecksTheBytes() {
        byte[] html = "<html><script>alert(1)</script>".getBytes();
        assertCode(List.of(file(html, "image/jpeg")), "BAD_PHOTO");
    }

    @Test
    void noPhotosIsFine() {
        assertThat(validator.validate(null)).isEmpty();
    }

    private void assertCode(List<MultipartFile> files, String code) {
        assertThatThrownBy(() -> validator.validate(files))
                .isInstanceOf(AppException.class)
                .extracting(e -> ((AppException) e).code())
                .isEqualTo(code);
    }
}
