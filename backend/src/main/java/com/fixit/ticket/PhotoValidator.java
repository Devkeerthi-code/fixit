package com.fixit.ticket;

import com.fixit.common.AppException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * Photos are resized in the browser, but the server never trusts that: it checks the count, the size,
 * and the file's first bytes (magic numbers), not the Content-Type header the client claims.
 */
@Component
public class PhotoValidator {

    public static final int MAX_PHOTOS = 3;
    public static final int MAX_BYTES = 512 * 1024;

    public record ValidPhoto(String contentType, byte[] bytes) {}

    public List<ValidPhoto> validate(List<MultipartFile> files) {
        List<MultipartFile> present = files == null ? List.of()
                : files.stream().filter(f -> f != null && !f.isEmpty()).toList();
        if (present.size() > MAX_PHOTOS) {
            throw AppException.badRequest("TOO_MANY_PHOTOS", "Attach up to " + MAX_PHOTOS + " photos");
        }
        List<ValidPhoto> result = new ArrayList<>();
        for (MultipartFile file : present) {
            byte[] bytes = read(file);
            if (bytes.length > MAX_BYTES) {
                throw AppException.badRequest("PHOTO_TOO_LARGE", "Each photo must be under 500 KB");
            }
            result.add(new ValidPhoto(detectType(bytes), bytes));
        }
        return result;
    }

    static String detectType(byte[] b) {
        if (b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (b.length > 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "image/webp";
        }
        throw AppException.badRequest("BAD_PHOTO", "Photos must be JPEG or WebP images");
    }

    private static byte[] read(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
